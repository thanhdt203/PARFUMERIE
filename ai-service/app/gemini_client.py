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
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
                "thinkingConfig": {"thinkingLevel": "low"},
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
            "generationConfig": {
                "maxOutputTokens": 1200,
                "thinkingConfig": {"thinkingLevel": "low"},
            },
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
            candidate = response.json()["candidates"][0]
            if candidate.get("finishReason") == "MAX_TOKENS":
                raise GeminiError("Gemini đã dùng hết giới hạn phản hồi")
            parts = candidate["content"]["parts"]
            answer_parts = [part["text"] for part in parts if part.get("text") and not part.get("thought", False)]
            if not answer_parts:
                answer_parts = [part["text"] for part in parts if part.get("text")]
            answer = "".join(answer_parts).strip()
            if not answer:
                raise GeminiError("Gemini trả về nội dung rỗng")
            return answer
        except GeminiError:
            raise
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise GeminiError("Gemini không trả về nội dung hợp lệ") from exc

