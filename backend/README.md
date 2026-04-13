# THE BIG GYM Backend

Backend đồ án tốt nghiệp cho website THE BIG GYM, dùng `Node.js + Express + MySQL`.

## Tính năng

- Đăng ký, đăng nhập người dùng bằng JWT
- CRUD đọc bài tập từ database
- Lưu lịch sử tính `TDEE`, `BMI`, `% mỡ`, `macro`
- Lưu chỉ số cơ thể theo thời gian
- Tạo kế hoạch tập luyện
- Lưu form liên hệ

## Cấu trúc

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

## Cài đặt

1. Mở terminal tại [backend](/c:/Users/Trung/Desktop/BigGym/backend)
2. Cài package:

```bash
npm install
```

3. Tạo file `.env` từ `.env.example`
4. Tạo database bằng file:

```sql
backend/database/migrations/001_schema.sql
backend/database/seeds/001_seed_data.sql
```

5. Chạy server:

```bash
npm run dev
```

API mặc định chạy tại:

```text
http://localhost:4000
```

## API chính

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/exercises`
- `GET /api/exercises/:slug`
- `POST /api/metrics`
- `GET /api/metrics/user/:userId`
- `POST /api/tdee-logs`
- `GET /api/tdee-logs/user/:userId`
- `GET /api/plans`
- `POST /api/plans`
- `POST /api/contacts`

## Gợi ý cho đồ án tốt nghiệp

- Dùng MySQL Workbench để vẽ ERD từ schema
- Làm phần quản trị cho `users`, `exercises`, `plans`, `contact_messages`
- Có thể bổ sung:
  - quên mật khẩu
  - lịch tập theo tuần
  - theo dõi tiến độ cân nặng bằng biểu đồ
  - dashboard cho admin và PT
