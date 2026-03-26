from fastapi import APIRouter, Depends
from app.dependencies import require_admin
from app.schemas.admin import LLMConfig, LLMConfigResponse
from app.services.admin_service import get_llm_config, set_llm_config

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/llm-config", response_model=LLMConfigResponse)
async def get_llm_configuration(current_user: dict = Depends(require_admin)):
    return get_llm_config()


@router.put("/llm-config", response_model=LLMConfigResponse)
async def update_llm_configuration(
    body: LLMConfig,
    current_user: dict = Depends(require_admin),
):
    set_llm_config(body.llm_base_url, body.llm_model)
    return get_llm_config()
