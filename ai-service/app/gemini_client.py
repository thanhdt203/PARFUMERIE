import json
from collections.abc import AsyncIterator

import httpx

from .config import Settings


class GeminiError(RuntimeError):
    pass


class GeminiClient:
    def __init__(self, config: Settings):
        self.config = config

    def _url(self, method: str = "generateContent") -> str:
        return "https://generativelanguage.googleapis.com/v1beta/models/" + f"{self.config.gemini_model}:{method}"

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

    @staticmethod
    def _text_payload(prompt: str) -> dict:
        return {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": 4096,
                "thinkingConfig": {"thinkingLevel": "low"},
            },
        }

    async def generate_text(self, prompt: str) -> str:
        return await self._request(self._text_payload(prompt))

    async def stream_text(self, prompt: str) -> AsyncIterator[str]:
        if not self.config.gemini_api_key:
            raise GeminiError("Chưa cấu hình GEMINI_API_KEY")
        emitted = False
        try:
            async with httpx.AsyncClient(timeout=self.config.gemini_timeout_seconds) as client:
                async with client.stream(
                    "POST", self._url("streamGenerateContent") + "?alt=sse",
                    headers={"x-goog-api-key": self.config.gemini_api_key},
                    json=self._text_payload(prompt),
                ) as response:
                    if response.status_code >= 400:
                        raise GeminiError(f"Gemini API trả về lỗi {response.status_code}")
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        try:
                            candidate = json.loads(line[5:])["candidates"][0]
                        except (KeyError, IndexError, TypeError, ValueError) as exc:
                            raise GeminiError("Gemini không trả về nội dung hợp lệ") from exc
                        parts = candidate.get("content", {}).get("parts", [])
                        text = "".join(part["text"] for part in parts if part.get("text") and not part.get("thought", False))
                        if text:
                            emitted = True
                            yield text
                        if candidate.get("finishReason") == "MAX_TOKENS":
                            raise GeminiError("Gemini đã dùng hết giới hạn phản hồi")
        except httpx.TimeoutException as exc:
            raise GeminiError("Gemini phản hồi quá thời gian") from exc
        except httpx.HTTPError as exc:
            raise GeminiError("Không thể kết nối Gemini API") from exc
        if not emitted:
            raise GeminiError("Gemini trả về nội dung rỗng")

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

