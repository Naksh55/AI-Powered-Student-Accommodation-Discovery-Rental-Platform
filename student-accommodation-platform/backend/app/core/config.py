from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # -- App --
    PROJECT_NAME: str = "Student Accommodation Platform API"
    API_V1_PREFIX: str = "/api/v1"

    # -- Database --
    # Example: postgresql+psycopg2://postgres:postgres@localhost:5432/accommodation_db
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/accommodation_db"

    # -- Auth --
    JWT_SECRET_KEY: str = "change-this-in-.env-never-commit-a-real-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # -- CORS --
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # -- AI layer (wired up in Milestone 3, present now so config is ready) --
    LLM_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
