import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    gemini_timeout_seconds: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "15"))
    host: str = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))


settings = Settings()

