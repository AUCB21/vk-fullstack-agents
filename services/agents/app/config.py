from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SAP Service Layer
    sap_sl_base_url: str = "https://localhost:50000/b1s/v1"
    sap_sl_company_db: str = ""
    sap_sl_verify_ssl: bool = True
    sap_sl_session_timeout: int = 1800  # 30 minutes

    # App
    agents_url: str = "http://localhost:8000"
    nextjs_url: str = "http://localhost:3000"
    session_secret: str = ""
    dev_mode: bool = False

    # LLM (Phase 1)
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-4-20250514"

    model_config = {
        "env_file": ["../../.env", ".env"],
        "env_file_encoding": "utf-8",
    }


settings = Settings()
