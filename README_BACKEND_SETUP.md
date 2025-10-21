### Chạy Backend bảo mật (Proxy Firebase)

1) Cấu hình
- Vào thư mục `server`, copy `.env.example` thành `.env` và cập nhật:
  - `FIREBASE_DATABASE_URL`: URL Realtime Database
  - `GOOGLE_APPLICATION_CREDENTIALS`: đường dẫn file service account JSON (ví dụ `./serviceAccountKey.json`) HOẶC dùng `FIREBASE_SERVICE_ACCOUNT_JSON`
  - `CORS_ORIGINS`: domain frontend được phép (ví dụ `http://localhost:5500` nếu mở file bằng Live Server)
  - (khuyến nghị) `API_KEY`: đặt khóa mạnh, sẽ nhập ở UI

2) Cài đặt và chạy
```bash
cd server
npm install
npm run dev
```

3) Cấu hình Frontend
- Mở `index.html` -> nút bánh răng (góc phải trên) -> nhập `API Base URL` (ví dụ `http://localhost:8080`), và `API Key` nếu đã bật.
- Từ nay các lệnh mở/đóng, log analytics sẽ đi qua backend.

4) Bảo mật
- Backend xác thực `x-api-key` (nếu bật) và có thể nhận `Authorization: Bearer <Firebase ID Token>` để phân quyền nâng cao (admin/writer) qua custom claims.
- Đã bật CORS, `helmet`, rate-limit và không để lộ service account trên client.
