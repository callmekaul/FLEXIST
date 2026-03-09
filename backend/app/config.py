from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://flexist:flexist_dev@localhost:5432/flexist"
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_anon_key: str = ""
    openai_api_key: str = ""
    admin_emails: str = ""  # comma-separated list of platform admin emails
    frontend_url: str = ""  # production frontend URL for CORS

    model_config = {"env_file": ".env.local", "extra": "ignore"}


settings = Settings()
