from pydantic import BaseModel


class LLMConfig(BaseModel):
    llm_base_url: str | None = None
    llm_model: str | None = None
    chat_llm_base_url: str | None = None
    chat_llm_model: str | None = None


class LLMConfigResponse(BaseModel):
    llm_base_url: str
    llm_model: str
    chat_llm_base_url: str
    chat_llm_model: str
    source: str  # "db" or "env"
