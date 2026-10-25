import json

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
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


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/recommend/stream")
async def recommend_stream(request: RecommendRequest) -> StreamingResponse:
    async def events():
        try:
            selection = await service.select(request)
            yield sse("products", {"product_ids": [product.id for product in selection.products]})
            async for text in service.stream_advice(
                request.message, selection.preferences, selection.products, request.mode, request.profile, selection.intent
            ):
                yield sse("delta", {"text": text})
            yield sse("done", {})
        except GeminiError as exc:
            yield sse("error", {"detail": str(exc)})
        except ValidationError:
            yield sse("error", {"detail": "Gemini trả về tiêu chí không hợp lệ"})

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)

