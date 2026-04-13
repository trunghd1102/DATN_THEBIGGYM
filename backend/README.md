# THE BIG GYM Backend

Backend API cho đồ án tốt nghiệp THE BIG GYM, xây dựng bằng `Node.js + Express + MySQL`.

## Stack

- `Node.js`
- `Express`
- `MySQL`
- `JWT Authentication`
- `Google Sign-In`
- `PayOS`
- `Nodemailer`

## Tính năng chính

- Đăng ký, đăng nhập bằng email/mật khẩu
- Đăng nhập Google
- API bài tập và chi tiết bài tập
- API sản phẩm, biến thể, đánh giá, giỏ hàng
- Checkout và tạo đơn hàng
- Dashboard admin
- Lưu chỉ số cơ thể, TDEE, macro, lịch sử tính toán
- Form liên hệ và phản hồi từ admin

## Cấu trúc thư mục

```text
backend/
  database/
    migrations/
    seeds/
  src/
    config/
    controllers/
    db/
    middleware/
    routes/
    services/
    utils/
```

## Chạy local

1. Cài dependency:

```bash
cd backend
npm install
```

2. Tạo file `.env` từ `.env.example`

3. Tạo database `biggym` trong MySQL

4. Chạy các file SQL trong `backend/database/migrations/` theo thứ tự tăng dần

5. Chạy seed nếu cần:

```sql
backend/database/seeds/001_seed_data.sql
backend/database/seeds/002_products_seed.sql
```

6. Khởi động server:

```bash
npm run dev
```

Mặc định API chạy tại:

```text
http://localhost:4000
```

## API chính

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/exercises`
- `GET /api/exercises/:slug`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/cart`
- `POST /api/cart`
- `POST /api/checkout`
- `GET /api/admin/*`
- `POST /api/metrics`
- `POST /api/tdee-logs`
- `GET /api/tdee-logs/me`
- `POST /api/contacts`

## Lưu ý

- Không commit `backend/.env`
- Không commit `backend/uploads/`
- Nếu dùng mail phản hồi liên hệ, cần cấu hình SMTP hợp lệ trong `.env`
