import json

import httpx

from .config import Settings


class GeminiError(RuntimeError):
    pass


class GeminiClient:
    def __init__(self, config: Settings):
        self.config = config

    def _url(self) -> str:
        return "https://generativelanguage.googleapis.com/v1beta/models/" + f"{self.config.gemini_model}:generateContent"

    async def generate_json(self, prompt: str, schema: dict) -> dict:
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
            },
        }
        text = await self._request(payload)
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise GeminiError("Gemini trả về JSON không hợp lệ") from exc

    async def generate_text(self, prompt: str) -> str:
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 300},
        }
        return await self._request(payload)

    async def _request(self, payload: dict) -> str:
        if not self.config.gemini_api_key:
            raise GeminiError("Chưa cấu hình GEMINI_API_KEY")
        try:
            async with httpx.AsyncClient(timeout=self.config.gemini_timeout_seconds) as client:
                response = await client.post(self._url(), headers={"x-goog-api-key": self.config.gemini_api_key}, json=payload)
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise GeminiError("Gemini phản hồi quá thời gian") from exc
        except httpx.HTTPStatusError as exc:
            raise GeminiError(f"Gemini API trả về lỗi {exc.response.status_code}") from exc
        except httpx.HTTPError as exc:
            raise GeminiError("Không thể kết nối Gemini API") from exc
        try:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise GeminiError("Gemini không trả về nội dung hợp lệ") from exc

