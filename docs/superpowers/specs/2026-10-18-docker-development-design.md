# Thiết kế Docker development/demo

## Mục tiêu

Chạy toàn bộ Parfumerie bằng một lệnh `docker compose up --build`, có hot reload cho frontend React, backend Node.js và AI service Python. Cấu hình phục vụ phát triển và demo cục bộ, không phải image production.

## Thành phần

Compose quản lý bốn service:

- `mongo`: MongoDB, chỉ công bố cổng `27018` ra máy host để tránh xung đột với MongoDB khác; dữ liệu nằm trong named volume.
- `ai-service`: Python 3.12, FastAPI/Uvicorn tại cổng nội bộ `8000`, mount source code và nạp bí mật từ `ai-service/.env`.
- `backend`: Node 22, Express/Nodemon tại cổng `5001`, kết nối `mongodb://mongo:27017/parfumerie` và `http://ai-service:8000`.
- `frontend`: Node 22, Vite tại cổng `5173`, trình duyệt gọi backend qua `http://localhost:5001/api`.

## File được bổ sung

```text
compose.yaml
frontend/Dockerfile.dev
frontend/.dockerignore
backend/Dockerfile.dev
backend/.dockerignore
ai-service/Dockerfile.dev
ai-service/.dockerignore
```

Dockerfile chỉ cài dependency và đặt lệnh development. Source code được bind mount từ máy host; `node_modules` và Python virtual environment/dependency layer không dùng chung với host.

## Mạng, cổng và thứ tự khởi động

Các container dùng mạng mặc định của Compose và gọi nhau bằng service name. `mongo` và `ai-service` có health check. Backend chỉ khởi động sau khi MongoDB khỏe; frontend chỉ khởi động sau backend. Backend vẫn xử lý trường hợp Gemini tạm thời lỗi mà không bị dừng.

Cổng công khai:

- Frontend: `5173`
- Backend: `5001`
- AI health/docs phục vụ kiểm tra: `8000`
- MongoDB host: `27018`

## Biến môi trường và bí mật

Compose đặt các biến không bí mật cần cho kết nối nội bộ. `GEMINI_API_KEY` và cấu hình model được đọc từ `ai-service/.env`; file này đã được git ignore và không được copy vào image. `ACCESS_TOKEN_SECRET` dùng giá trị development có thể thay qua biến môi trường host.

Frontend dùng `VITE_API_URL=http://localhost:5001/api` vì URL này được trình duyệt sử dụng, không phải container frontend. `VITE_USE_MOCK=false` bật API thật.

## Dữ liệu và lệnh vận hành

- Khởi động: `docker compose up --build`
- Chạy nền: `docker compose up --build -d`
- Seed lần đầu: `docker compose exec backend npm run seed` và `docker compose exec backend npm run seed:admin`
- Xem log: `docker compose logs -f`
- Dừng nhưng giữ dữ liệu: `docker compose down`
- Chỉ xóa dữ liệu khi chủ động chạy `docker compose down -v`

Seed không tự động chạy lúc container khởi động để tránh thay đổi dữ liệu ngoài ý muốn.

## Kiểm thử và tiêu chí hoàn thành

1. `docker compose config` hợp lệ và không in hoặc nhúng API key vào image.
2. Bốn image build thành công trên Docker hiện tại.
3. Bốn container đạt trạng thái chạy/healthy.
4. `GET http://localhost:5173` và `GET http://localhost:5001/api/products` trả HTTP 200 sau khi seed.
5. `GET http://localhost:8000/health` xác nhận Gemini đã được cấu hình.
6. `POST http://localhost:5001/api/ai/chat` trả lời tiếng Việt và sản phẩm MongoDB qua Gemini thật.
7. Sửa file nguồn làm service liên quan tự reload mà không cần build lại.

## Ngoài phạm vi

Thiết kế này không bao gồm reverse proxy, HTTPS, image nhiều stage tối ưu production, registry, CI/CD, Kubernetes hoặc Docker secrets dành cho môi trường production.
