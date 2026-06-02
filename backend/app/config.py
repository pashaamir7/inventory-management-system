from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@db:5432/inventory_db"
    secret_key: str = "changeme-in-production"
    debug: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
