from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    openai_api_key: str = ""
    # Set to any OpenAI-compatible base URL (e.g. http://localhost:11434/v1 for Ollama,
    # https://api.groq.com/openai/v1 for Groq). Leave empty to use the default OpenAI endpoint.
    llm_base_url: str = ""
    llm_model: str = "gpt-4o-mini"
    weather_api_key: str = ""
    frontend_url: str = "http://localhost:3000"


settings = Settings()
