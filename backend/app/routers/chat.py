import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.dependencies import get_current_user, check_trip_access
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services.supabase_client import get_supabase
from app.services.chat_service import fetch_trip_context, build_chat_context, chat_completion

router = APIRouter(prefix="/trips/{trip_id}/chat", tags=["chat"])

MAX_HISTORY = 20


@router.get("", response_model=list[ChatMessageResponse])
async def get_chat_history(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_supabase()
    check_trip_access(trip_id, current_user["id"], db)
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

    trip, profiles, bags, checklist_items = fetch_trip_context(db, trip_id, user_id)

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
    check_trip_access(trip_id, current_user["id"], db)
    db.table("chat_messages").delete().eq("trip_id", trip_id).execute()
    return {"ok": True}
