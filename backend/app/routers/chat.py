import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.dependencies import get_current_user, check_trip_access
from app.constants import MAX_CHAT_HISTORY
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.repositories.chat_repository import ChatRepository
from app.services.chat_service import fetch_trip_context, build_chat_context, chat_completion

router = APIRouter(prefix="/trips/{trip_id}/chat", tags=["chat"])


@router.get("", response_model=list[ChatMessageResponse])
async def get_chat_history(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    check_trip_access(trip_id, current_user["id"])
    messages = ChatRepository().list_by_trip(trip_id, limit=50)
    return [ChatMessageResponse(**r) for r in messages]


@router.post("")
async def send_chat_message(
    trip_id: str,
    body: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    chat_repo = ChatRepository()

    trip, profiles, bags, checklist_items = fetch_trip_context(trip_id, user_id)

    chat_repo.create({
        "trip_id": trip_id,
        "user_id": user_id,
        "role": "user",
        "content": body.message,
    })

    history_rows = chat_repo.list_by_trip_desc(trip_id, limit=MAX_CHAT_HISTORY)
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

        result = chat_repo.create({
            "trip_id": trip_id,
            "user_id": user_id,
            "role": "assistant",
            "content": full_content,
        })

        msg_id = result.get("id") if result else None
        yield f"data: {json.dumps({'done': True, 'message_id': msg_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.delete("")
async def clear_chat_history(
    trip_id: str,
    current_user: dict = Depends(get_current_user),
):
    check_trip_access(trip_id, current_user["id"])
    ChatRepository().delete_by_trip(trip_id)
    return {"ok": True}
