import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.dependencies import get_current_user
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services.supabase_client import get_supabase
from app.services.chat_service import build_chat_context, chat_completion
from app.utils.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/trips/{trip_id}/chat", tags=["chat"])

MAX_HISTORY = 20


def _check_trip_access(trip: dict, user_id: str) -> None:
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise ForbiddenError()


def _fetch_trip_context(db, trip_id: str, user_id: str):
    """Fetch trip and all context needed for chat."""
    trip_result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip_result.data:
        raise NotFoundError("Trip not found")
    trip = trip_result.data
    _check_trip_access(trip, user_id)

    # Profiles
    tp_result = db.table("trip_profiles").select("profile_id").eq("trip_id", trip_id).execute()
    profile_ids = [r["profile_id"] for r in (tp_result.data or [])]
    profiles = []
    if profile_ids:
        p_result = db.table("profiles").select("*").in_("id", profile_ids).execute()
        profiles = p_result.data or []

    # Bags
    bags = (db.table("bags").select("*").eq("trip_id", trip_id).execute()).data or []

    # Checklist items
    checklist_items = (
        db.table("checklist_items")
        .select("*")
        .eq("trip_id", trip_id)
        .order("sort_order")
        .order("created_at")
        .execute()
    ).data or []

    return trip, profiles, bags, checklist_items


@router.get("", response_model=list[ChatMessageResponse])
async def get_chat_history(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_supabase()
    user_id = current_user["id"]

    # Verify access
    trip_result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip_result.data:
        raise NotFoundError("Trip not found")
    _check_trip_access(trip_result.data, user_id)

    result = (
        db.table("chat_messages")
        .select("*")
        .eq("trip_id", trip_id)
        .order("created_at")
        .limit(50)
        .execute()
    )
    return [ChatMessageResponse(**r) for r in (result.data or [])]


@router.post("")
async def send_chat_message(
    trip_id: str,
    body: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_supabase()
    user_id = current_user["id"]

    trip, profiles, bags, checklist_items = _fetch_trip_context(db, trip_id, user_id)

    # Save user message
    db.table("chat_messages").insert({
        "trip_id": trip_id,
        "user_id": user_id,
        "role": "user",
        "content": body.message,
    }).execute()

    # Load conversation history (last N messages)
    history_result = (
        db.table("chat_messages")
        .select("*")
        .eq("trip_id", trip_id)
        .order("created_at", desc=True)
        .limit(MAX_HISTORY)
        .execute()
    )
    history_rows = list(reversed(history_result.data or []))
    messages = [{"role": r["role"], "content": r["content"]} for r in history_rows]

    # Build system prompt with current trip context
    system_prompt = build_chat_context(trip, profiles, bags, checklist_items)

    async def generate():
        full_content = ""
        try:
            async for chunk in chat_completion(system_prompt, messages):
                full_content += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Save assistant message
        result = db.table("chat_messages").insert({
            "trip_id": trip_id,
            "user_id": user_id,
            "role": "assistant",
            "content": full_content,
        }).execute()

        msg_id = result.data[0]["id"] if result.data else None
        yield f"data: {json.dumps({'done': True, 'message_id': msg_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.delete("")
async def clear_chat_history(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_supabase()
    user_id = current_user["id"]

    trip_result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip_result.data:
        raise NotFoundError("Trip not found")
    _check_trip_access(trip_result.data, user_id)

    db.table("chat_messages").delete().eq("trip_id", trip_id).execute()
    return {"ok": True}
