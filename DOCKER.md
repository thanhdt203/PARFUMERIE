# Chạy Parfumerie bằng Docker (development/demo)

## Chuẩn bị

Tạo cấu hình Gemini nếu chưa có:

```bash
cp ai-service/.env.example ai-service/.env
```

Điền `GEMINI_API_KEY` trong `ai-service/.env`. Không commit file này.

## Khởi động

```bash
docker compose up --build -d
docker compose ps
```

Địa chỉ dịch vụ:

- Website: http://localhost:5173
- Backend API: http://localhost:5001/api
- AI health: http://localhost:8000/health
- MongoDB: `mongodb://127.0.0.1:27018/parfumerie`

## Tạo dữ liệu mẫu

Chỉ cần chạy lần đầu hoặc khi database đang trống:

```bash
docker compose exec backend npm run seed
docker compose exec backend npm run seed:admin
```

## Lệnh thường dùng

```bash
# Theo dõi log
docker compose logs -f

# Khởi động lại một service
docker compose restart ai-service

# Dừng và giữ nguyên dữ liệu MongoDB
docker compose down

# Xóa cả container và dữ liệu MongoDB (không thể hoàn tác)
docker compose down -v
```

Source code được mount vào container. Vite, Nodemon và Uvicorn tự reload khi file tương ứng thay đổi.

## Email reset mật khẩu (Quản lý người dùng)

Trang Admin > Người dùng gửi mật khẩu mới qua email. Đặt các biến sau (shell hoặc file `.env` cạnh `compose.yaml`) rồi `docker compose up -d --build backend`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ban@gmail.com
SMTP_PASS=mat-khau-ung-dung
MAIL_FROM="Parfumerie <ban@gmail.com>"
```

Chưa đặt `SMTP_HOST`: môi trường dev chỉ ghi log backend, production sẽ báo lỗi 503. Nhân viên cũ chưa có email thì cần bổ sung trường `Email` trước khi reset được.
