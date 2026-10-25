# Parfumerie AI Service

Backend Python/FastAPI dùng Gemini để phân tích nhu cầu và tư vấn sản phẩm nước hoa. MongoDB vẫn do backend Node.js quản lý; service này chỉ nhận catalog đã chuẩn hóa và trả về các ID phù hợp.

## Cài đặt

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
```

Điền `GEMINI_API_KEY` trong `.env`. Có thể tạo API key tại Google AI Studio.

## Chạy

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Kiểm tra service:

```bash
curl http://127.0.0.1:8000/health
```

Backend Node.js cần cấu hình `AI_SERVICE_URL=http://127.0.0.1:8000` và frontend cần `VITE_USE_MOCK=false`.

## Test

```bash
pytest -q
```

