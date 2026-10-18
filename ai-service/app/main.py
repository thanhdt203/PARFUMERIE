from fastapi import FastAPI, HTTPException
from pydantic import ValidationError

from .config import settings
from .gemini_client import GeminiClient, GeminiError
from .recommendation import RecommendationService
from .schemas import RecommendRequest, RecommendResponse


app = FastAPI(title="Parfumerie AI Service", version="0.1.0")
service = RecommendationService(GeminiClient(settings))


@app.get("/health")
async def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "gemini_configured": bool(settings.gemini_api_key),
        "model": settings.gemini_model,
    }


@app.post("/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest) -> RecommendResponse:
    try:
        return await service.recommend(request)
    except GeminiError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=503, detail="Gemini trả về tiêu chí không hợp lệ") from exc


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)

