# Thiết kế MVP trợ lý AI Gemini

## Mục tiêu

Xây dựng trợ lý tư vấn nước hoa bằng Gemini. Người dùng nhập nhu cầu bằng tiếng Việt và nhận lời tư vấn kèm tối đa ba sản phẩm có thật trong MongoDB. MVP hỗ trợ khách vãng lai, không lưu lịch sử hội thoại và chưa triển khai cá nhân hóa theo hành vi hoặc RAG/vector database.

## Kiến trúc

Phần AI là một backend Python độc lập tại `ai-service/`, sử dụng FastAPI và chạy mặc định ở cổng 8000. Frontend không gọi trực tiếp dịch vụ Python. Backend Node.js là cổng truy cập duy nhất từ frontend và chứa adapter tại `backend/src/ai/`.

Luồng xử lý:

1. Frontend gửi `POST /api/ai/chat` tới backend Node.js với câu hỏi và lịch sử trò chuyện ngắn.
2. Backend kiểm tra dữ liệu đầu vào và lấy danh sách sản phẩm đang hiển thị, biến thể giá và tồn kho từ MongoDB.
3. Backend gọi `POST /recommend` của Python AI service với câu hỏi, lịch sử và danh sách sản phẩm đã chuẩn hóa.
4. Gemini phân tích nhu cầu thành tiêu chí có cấu trúc: giới tính, dịp sử dụng, mùa/thời tiết, phong cách, nhóm hương và ngân sách tối đa.
5. Python lọc/chấm điểm sản phẩm bằng dữ liệu thật. Gemini chỉ viết lời giải thích cho tối đa ba sản phẩm đã được chọn; Gemini không tự tạo ID, giá hoặc tồn kho.
6. Backend kiểm tra các ID trả về, nạp lại dữ liệu sản phẩm từ MongoDB và trả đúng hợp đồng mà frontend hiện tại đang sử dụng.

## Cấu trúc mã nguồn

```text
ai-service/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── gemini_client.py
│   ├── prompts.py
│   ├── recommendation.py
│   └── schemas.py
├── tests/
├── .env.example
├── .gitignore
└── requirements.txt

backend/src/ai/
├── aiRoute.js
├── aiController.js
└── aiService.js
```

## Hợp đồng API

API công khai qua Node.js:

```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Nước hoa nam ấm áp đi tiệc dưới 2 triệu",
  "history": [
    { "role": "user", "content": "Tôi thích mùi gỗ" }
  ]
}
```

Phản hồi:

```json
{
  "reply": "Dựa trên nhu cầu của bạn...",
  "products": [
    {
      "_id": "...",
      "TenSP": "...",
      "ThuongHieu": { "TenTH": "..." },
      "GiaThapNhat": 1000000,
      "GiaCaoNhat": 1800000,
      "AnhChinh": "..."
    }
  ]
}
```

API nội bộ Python nhận thêm danh sách sản phẩm đã chuẩn hóa và trả `reply` cùng danh sách `product_ids`. Dịch vụ Python không truy cập MongoDB trực tiếp để giữ ranh giới rõ ràng với backend nghiệp vụ.

## Cấu hình và bảo mật

- `GEMINI_API_KEY` chỉ được lưu trong `ai-service/.env`, không commit và không gửi xuống trình duyệt.
- `GEMINI_MODEL` có giá trị mặc định được cấu hình tập trung, có thể thay đổi qua biến môi trường.
- Backend dùng `AI_SERVICE_URL=http://127.0.0.1:8000` và timeout hữu hạn khi gọi Python.
- Giới hạn độ dài câu hỏi, số tin lịch sử và kích thước catalog gửi sang AI service.
- Prompt yêu cầu trả lời tiếng Việt, không tuyên bố thông tin sản phẩm ngoài dữ liệu đầu vào.

## Xử lý lỗi

- Thiếu API key: Python trả lỗi cấu hình rõ ràng và không khởi tạo yêu cầu Gemini.
- Gemini quá thời gian, hết quota hoặc phản hồi không hợp lệ: Python trả mã lỗi phù hợp; Node.js chuyển thành thông báo thân thiện mà không làm dừng server.
- Không có sản phẩm phù hợp: trả lời đề nghị người dùng nới tiêu chí và trả danh sách sản phẩm rỗng.
- ID do AI service trả về luôn được Node.js đối chiếu lại trong MongoDB trước khi gửi cho frontend.

## Kiểm thử và tiêu chí hoàn thành

- Unit test bộ lọc/chấm điểm sản phẩm mà không cần gọi Gemini.
- Test validation cho câu hỏi rỗng, lịch sử quá dài và payload sản phẩm sai cấu trúc.
- Test mock Gemini cho phản hồi hợp lệ, lỗi quota và timeout.
- Integration test route Node.js với AI service giả lập.
- Chạy thử từ giao diện với câu: “Nước hoa nam ấm áp đi tiệc mùa đông dưới 2 triệu”.
- Kết quả chỉ chứa sản phẩm tồn tại trong MongoDB, đúng giá, có tồn kho và tối đa ba sản phẩm.
- Khi Gemini lỗi, giao diện hiển thị thông báo và cả Node.js lẫn Python service vẫn hoạt động.

## Ngoài phạm vi MVP

Lưu lịch sử hội thoại, giới hạn lượt dùng thử, cá nhân hóa theo lịch sử xem/mua, embeddings, vector database, trang Admin cấu hình prompt/knowledge base, streaming và thêm trực tiếp sản phẩm vào giỏ sẽ được thực hiện ở giai đoạn sau.
