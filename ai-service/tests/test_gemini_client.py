import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import main
from app.config import Settings
from app.gemini_client import GeminiClient, GeminiError


def client_with(monkeypatch, handler, api_key="test-key"):
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    return GeminiClient(Settings(gemini_api_key=api_key))


def ok_response(text):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}]})


@pytest.mark.asyncio
async def test_missing_api_key_does_not_call_gemini(monkeypatch):
    calls = []
    client = client_with(monkeypatch, lambda request: calls.append(request) or ok_response("x"), api_key="")
    with pytest.raises(GeminiError, match="GEMINI_API_KEY"):
        await client.generate_text("hi")
    assert calls == []


@pytest.mark.asyncio
async def test_valid_text_response(monkeypatch):
    client = client_with(monkeypatch, lambda request: ok_response(" xin chào "))
    assert await client.generate_text("hi") == "xin chào"


@pytest.mark.asyncio
async def test_valid_json_response(monkeypatch):
    client = client_with(monkeypatch, lambda request: ok_response('{"gender": "nam"}'))
    assert await client.generate_json("hi", {}) == {"gender": "nam"}


@pytest.mark.asyncio
async def test_quota_error_becomes_gemini_error(monkeypatch):
    client = client_with(monkeypatch, lambda request: httpx.Response(429, json={"error": "quota"}))
    with pytest.raises(GeminiError, match="429"):
        await client.generate_text("hi")


@pytest.mark.asyncio
async def test_timeout_becomes_gemini_error(monkeypatch):
    def handler(request):
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(GeminiError, match="quá thời gian"):
        await client_with(monkeypatch, handler).generate_text("hi")


@pytest.mark.asyncio
async def test_invalid_json_becomes_gemini_error(monkeypatch):
    client = client_with(monkeypatch, lambda request: ok_response("not json"))
    with pytest.raises(GeminiError, match="JSON"):
        await client.generate_json("hi", {})


@pytest.mark.asyncio
async def test_malformed_response_becomes_gemini_error(monkeypatch):
    client = client_with(monkeypatch, lambda request: httpx.Response(200, json={"candidates": []}))
    with pytest.raises(GeminiError):
        await client.generate_text("hi")


def product(**overrides):
    return {"id": "p1", "name": "Eros", "gender": "nam", "min_price": 1, "max_price": 2, **overrides}


def test_recommend_endpoint_returns_503_on_gemini_error(monkeypatch):
    async def failing(request):
        raise GeminiError("Gemini API trả về lỗi 429")

    monkeypatch.setattr(main.service, "recommend", failing)
    response = TestClient(main.app).post("/recommend", json={"message": "hi", "products": [product()]})
    assert response.status_code == 503
    assert "429" in response.json()["detail"]


@pytest.mark.parametrize("payload", [
    {"message": "", "products": []},
    {"message": "   ", "products": []},
    {"message": "x" * 301, "products": []},
    {"message": "hi", "products": [], "history": [{"role": "user", "content": "x"}] * 11},
    {"message": "hi", "products": [{"id": "p1"}]},
    {"message": "hi", "products": [product(gender="alien")]},
    {"message": "hi", "products": [product(id="p")] * 101},
])
def test_recommend_endpoint_validates_payload(payload):
    assert TestClient(main.app).post("/recommend", json=payload).status_code == 422


def sse_response(*texts, finish=None):
    lines = []
    for text in texts:
        lines.append("data: " + json.dumps({"candidates": [{"content": {"parts": [{"text": text}]}}]}))
        lines.append("")
    if finish:
        lines.append("data: " + json.dumps({"candidates": [{"finishReason": finish}]}))
        lines.append("")
    return httpx.Response(200, content="\n".join(lines).encode(), headers={"content-type": "text/event-stream"})


@pytest.mark.asyncio
async def test_stream_text_yields_chunks_and_skips_thoughts(monkeypatch):
    def handler(request):
        assert request.url.path.endswith(":streamGenerateContent")
        assert request.url.params["alt"] == "sse"
        thought = "data: " + json.dumps({"candidates": [{"content": {"parts": [{"text": "nghĩ", "thought": True}]}}]})
        return httpx.Response(200, content=(thought + "\n\n" + sse_response("Xin ", "chào").text).encode())
    client = client_with(monkeypatch, handler)
    assert [chunk async for chunk in client.stream_text("hi")] == ["Xin ", "chào"]


@pytest.mark.asyncio
async def test_stream_text_http_error(monkeypatch):
    client = client_with(monkeypatch, lambda request: httpx.Response(429, json={"error": "quota"}))
    with pytest.raises(GeminiError, match="429"):
        [chunk async for chunk in client.stream_text("hi")]


@pytest.mark.asyncio
async def test_stream_text_empty(monkeypatch):
    client = client_with(monkeypatch, lambda request: sse_response())
    with pytest.raises(GeminiError, match="rỗng"):
        [chunk async for chunk in client.stream_text("hi")]


@pytest.mark.asyncio
async def test_stream_text_max_tokens(monkeypatch):
    client = client_with(monkeypatch, lambda request: sse_response("a", finish="MAX_TOKENS"))
    with pytest.raises(GeminiError, match="giới hạn"):
        [chunk async for chunk in client.stream_text("hi")]


@pytest.mark.asyncio
async def test_stream_text_missing_api_key(monkeypatch):
    client = client_with(monkeypatch, lambda request: sse_response("x"), api_key="")
    with pytest.raises(GeminiError, match="GEMINI_API_KEY"):
        [chunk async for chunk in client.stream_text("hi")]
