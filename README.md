# DATN_THEBIGGYM

Website đồ án tốt nghiệp cho phòng gym `THE BIG GYM`, gồm frontend public, dashboard admin và backend API riêng.

## Tổng quan

Project này được xây dựng theo mô hình:

- frontend tĩnh bằng `HTML + TailwindCSS + Vanilla JavaScript`
- backend bằng `Node.js + Express`
- database `MySQL`
- thanh toán qua `PayOS`
- đăng nhập Google
- deploy domain bằng `Caddy`

Hiện repo phục vụ các nhóm chức năng chính:

- Trang chủ và landing page thương hiệu
- Cửa hàng supplement, giỏ hàng, checkout, tra cứu đơn
- Thư viện bài tập và trang chi tiết bài tập
- Công cụ sức khỏe: `TDEE`, `BMI`, `% mỡ`, `macro`, lịch sử tính toán
- Trang liên hệ và luồng phản hồi từ admin
- Dashboard admin quản lý đơn hàng, sản phẩm, bài tập, người dùng, thông báo

## Công nghệ sử dụng

### Frontend

- `HTML`
- `TailwindCSS CDN`
- `Vanilla JavaScript`
- `Chart.js`

### Backend

- `Node.js`
- `Express`
- `MySQL2`
- `JWT`
- `Google Auth Library`
- `Multer`
- `Nodemailer`
- `PayOS SDK`

## Cấu trúc thư mục

```text
.
├─ assets/                 # image, script dùng cho frontend
├─ backend/
│  ├─ database/
│  │  ├─ migrations/       # migration MySQL
│  │  └─ seeds/            # dữ liệu mẫu
│  └─ src/                 # app Express
├─ deploy/                 # Caddyfile phục vụ domain
├─ pages/
│  ├─ baitap_pages/
│  ├─ service_pages/
│  └─ shop_pages/
├─ scripts/                # script hỗ trợ bảo trì / rebuild
└─ index.html
```

## Chạy local

### 1. Backend

```bash
cd backend
npm install
```

Tạo file `.env` từ `backend/.env.example`, sau đó cấu hình:

- kết nối MySQL
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `PAYOS_*`
- SMTP nếu dùng phản hồi email

Khởi động backend:

```bash
npm run dev
```

Mặc định:

```text
http://localhost:4000
```

### 2. Database

Tạo database `biggym`, rồi chạy các file trong:

```text
backend/database/migrations/
```

theo đúng thứ tự tăng dần.

Nếu cần dữ liệu mẫu, chạy thêm:

```text
backend/database/seeds/001_seed_data.sql
backend/database/seeds/002_products_seed.sql
```

### 3. Frontend

Frontend là file tĩnh. Có thể mở bằng:

- `Live Server`
- `http-server`
- hoặc Caddy/Nginx

Khi frontend chạy cùng domain với backend, client sẽ ưu tiên gọi API qua `/api`.

## Deploy

Repo này đang được chuẩn bị cho deploy bằng `Caddy`.

File cấu hình:

- [Caddyfile](c:/Users/Trung/Desktop/BigGym/deploy/Caddyfile)

Mô hình deploy:

- domain public phục vụ file tĩnh từ root project
- `/api/*` reverse proxy vào backend `127.0.0.1:4000`
- `/uploads/*` reverse proxy vào backend

Ví dụ chạy backend:

```bash
cd backend
npm start
```

Ví dụ chạy Caddy:

```bash
deploy\\caddy.exe run --config deploy\\Caddyfile
```

## Tính năng nổi bật

### Shop

- sản phẩm có biến thể `hương vị + quy cách`
- giỏ hàng guest và user
- đồng bộ tồn kho theo biến thể
- checkout và tạo đơn
- tra cứu đơn hàng

### Bài tập

- danh sách bài tập theo nhóm và cấp độ
- chi tiết bài tập động
- gợi ý bài tập liên quan
- admin có thể cập nhật nội dung bài tập từ dashboard

### Công cụ sức khỏe

- tính `TDEE`
- gợi ý calories cho `cut / recomp / bulk`
- tính `BMI`
- ước tính `% mỡ cơ thể`
- gợi ý `macro`
- lưu lịch sử theo tài khoản
- đối chiếu các lần đo

### Liên hệ và admin

- người dùng gửi lời nhắn từ trang liên hệ
- admin xem lời nhắn trong dashboard
- admin có thể phản hồi qua email nếu SMTP đã cấu hình

## Backup và khôi phục

Repo này đã được đưa vào `git` để làm backup mã nguồn.

Luồng làm việc khuyến nghị:

```bash
git add .
git commit -m "mo ta thay doi"
git push
```

Khôi phục 1 file từ commit cũ:

```bash
git restore --source <commit-id> -- pages/admin.html
```

Khôi phục toàn bộ source về một commit:

```bash
git restore --source <commit-id> -- .
```

## Lưu ý bảo mật

Không commit các file/runtime sau:

- `backend/.env`
- `backend/node_modules/`
- `backend/uploads/`
- `.vscode/`
- binary như `deploy/caddy.exe`

`.gitignore` hiện đã chặn các mục này.

## Hướng phát triển tiếp

- chuẩn hóa README ảnh chụp màn hình
- thêm CI kiểm tra syntax cho JS và SQL
- thêm script migration runner
- tách cấu hình `dev` và `production`
- hoàn thiện README cho phần deploy/public domain
