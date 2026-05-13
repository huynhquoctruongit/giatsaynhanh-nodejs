# Laundry QR Backend

Backend cho hệ thống quản lý đơn giặt sấy có QR code. Khi tạo đơn → sinh QR; khách scan → xem trạng thái; nhân viên scan → cập nhật trạng thái.

## Tech stack

- **Runtime**: Node.js >= 18, TypeScript
- **Framework**: Express
- **DB**: PostgreSQL + Prisma ORM
- **Auth**: JWT (Bearer) + bcrypt
- **Validate**: zod
- **QR**: qrcode + UUID token

## Cấu trúc thư mục

```
src/
├── config/        # env, prisma client
├── modules/       # auth, customer, order, qr (mỗi module có service/controller/routes)
├── middlewares/   # auth, validate, error
├── helpers/
│   ├── enums/
│   ├── constants/
│   ├── mappers/
│   ├── utils/     # qr, jwt, hash, errors, order-code, async-handler
│   └── validators/
├── app.ts         # express app factory
├── routes.ts      # aggregate api router
└── server.ts      # entrypoint
prisma/
├── schema.prisma
└── seed.ts
```

## Cài đặt & chạy

```bash
cp .env.example .env
# sửa DATABASE_URL, DIRECT_URL, JWT_SECRET, PUBLIC_WEB_URL trong .env

npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

Server chạy ở `http://localhost:4000`. Health check: `GET /api/health`.

Tài khoản seed:
- Admin: `admin@laundry.local` / `admin123`
- Staff: `staff@laundry.local` / `staff123`

## Dùng Neon (Postgres serverless)

Neon free tier (~0.5GB + auto-suspend) đủ chạy demo/production nhỏ.

1. Vào [neon.tech](https://neon.tech) → tạo project mới (chọn region gần nhất, ví dụ `ap-southeast-1` Singapore)
2. Trong project Dashboard → tab **Connection Details**, copy 2 connection string:
   - **Pooled connection** (có `-pooler` trong host) → đặt vào `DATABASE_URL`
   - **Direct connection** (không có `-pooler`) → đặt vào `DIRECT_URL`
3. Thêm `?sslmode=require` (đã có sẵn ở URL Neon) và `&pgbouncer=true&connect_timeout=15` vào `DATABASE_URL`
4. Chạy migrate lần đầu:
   ```bash
   npm run prisma:generate
   npm run prisma:deploy    # production-safe (không reset DB)
   npm run seed             # tạo admin/staff demo
   ```

Lý do dùng 2 URL: Neon đi qua **PgBouncer** ở chế độ pooled (kết nối nhanh, ít connection) nhưng **không chạy được migrations**. `DIRECT_URL` bypass pooler để Prisma migrate chạy được.

## Luồng QR

```
Staff tạo order
  POST /api/orders  (auth)
  → backend generate qrToken (UUID) + code (LD-yyyymmdd-XXXXX)
  → response chứa qr.url = ${PUBLIC_WEB_URL}/q/<token>

Staff lấy QR image
  GET /api/orders/:id/qr       → { dataUrl, token, code }
  GET /api/orders/:id/qr.png   → trả PNG buffer (in trên hoá đơn)

Khách scan QR (mở /q/<token> trên web FE)
  Web FE gọi: GET /api/qr/<token>
  → backend trả thông tin order (đã mask phone)
  → backend ghi ScanHistory action=VIEW

Nhân viên scan QR để xem (logged auth)
  GET  /api/qr/<token>  với Bearer token
  → trả full order (không mask)
  → ghi ScanHistory với userId

Nhân viên cập nhật trạng thái (vd "đã giao")
  PATCH /api/orders/:id/status  body: { status: "DELIVERED" }
  → ghi ScanHistory action=UPDATE_STATUS với userId, meta.newStatus

Xem lịch sử scan
  GET /api/orders/:id/scan-history  (auth)
```

## API tổng hợp

### Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` |
| POST | `/api/auth/register` | ADMIN | `{ email, password, name, role? }` |
| GET  | `/api/auth/me` | staff | - |

### Customers (toàn bộ yêu cầu staff)
| Method | Path | Body |
|---|---|---|
| GET    | `/api/customers?search=&page=&pageSize=` | - |
| GET    | `/api/customers/:id` | - |
| POST   | `/api/customers` | `{ name, phone, address?, note? }` |
| PATCH  | `/api/customers/:id` | partial |
| DELETE | `/api/customers/:id` | - |

### Products (toàn bộ yêu cầu staff)
| Method | Path | Body |
|---|---|---|
| GET    | `/api/products?search=&isActive=&page=&pageSize=` | - |
| GET    | `/api/products/:id` | - |
| POST   | `/api/products` | `{ name, unit?, price, isActive?, note? }` |
| PATCH  | `/api/products/:id` | partial |
| DELETE | `/api/products/:id` | soft delete (set isActive=false) |

### Orders (toàn bộ yêu cầu staff)
| Method | Path | Body |
|---|---|---|
| GET    | `/api/orders?search=&status=&customerId=&page=&pageSize=` | - |
| GET    | `/api/orders/:id` | - |
| POST   | `/api/orders` | `{ customerId, note?, pickupAt?, items: [{ name, quantity, weight?, unitPrice }] }` |
| PATCH  | `/api/orders/:id` | partial |
| PATCH  | `/api/orders/:id/status` | `{ status }` |
| DELETE | `/api/orders/:id` | - |
| GET    | `/api/orders/:id/qr` | trả `{ dataUrl, token, code }` |
| GET    | `/api/orders/:id/qr.png` | trả PNG |
| GET    | `/api/orders/:id/scan-history` | - |

### QR (public/scan)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET  | `/api/qr/:token` | optional | Khách scan: trả info đã mask; staff (có Bearer): trả full |
| POST | `/api/qr/:token/scan` | staff | Ghi nhận staff scan rõ ràng |

## State machine của Order

```
CREATED → RECEIVED → WASHING → READY → DELIVERED
   ↓          ↓          ↓        ↓
        CANCELLED (chỉ trước khi DELIVERED)
```

Validate transition ở `order.service.ts → VALID_TRANSITIONS`.

## Bảo mật QR

- `qrToken` là UUID v4 random (~122 bit entropy) → không thể đoán.
- Token được lưu unique trong DB, mọi truy vấn QR phải qua DB → token bị huỷ (xoá order) sẽ trả 404 ngay.
- Khách scan (không login) chỉ thấy info công khai, **phone bị mask**.
- Mọi lần scan đều ghi `ScanHistory` (orderId, userId?, ip, userAgent) → kiểm toán đầy đủ.
- Chỉ staff đã login mới được `PATCH /:id/status` để cập nhật trạng thái.
- Có thể nâng cấp: rotate token khi đơn DELIVERED, hoặc rate-limit theo IP.

## Ghi chú triển khai

- Cần PostgreSQL >= 13 (local/Docker/Neon đều dùng được).
- FE cần có route `/q/:token` để gọi `GET /api/qr/:token` và render UI cho khách.
- Khi in hoá đơn, FE có thể dùng `dataUrl` (data:image/png;base64,...) trực tiếp trong `<img src>`.
- Deploy nhanh: **Neon** (DB) + **Render** (app) — đã có sẵn `render.yaml` Blueprint, xem section dưới.

## Deploy lên Render

Project có sẵn `render.yaml` (Render Blueprint). Steps:

1. **Tạo Neon DB trước** (xem section "Dùng Neon" phía trên), lấy 2 URL: `DATABASE_URL` (pooled) và `DIRECT_URL` (direct)
2. Vào [render.com](https://render.com) → đăng nhập GitHub → **New → Blueprint**
3. Connect repo `huynhquoctruongit/giatsaynhanh-nodejs`, branch `main` → Render sẽ tự phát hiện `render.yaml`
4. Render hỏi 4 env cần điền tay:
   - `DATABASE_URL` — pooled URL của Neon
   - `DIRECT_URL` — direct URL của Neon
   - `PUBLIC_WEB_URL` — URL của Vercel FE (vd `https://giatsaynhanh.vercel.app`)
   - `CORS_ORIGINS` — URL FE, phân tách dấu phẩy (vd `https://giatsaynhanh.vercel.app`)
   - (`JWT_SECRET` được Render auto-generate, `NODE_ENV=production` đã hardcode trong blueprint)
5. Bấm **Apply** → Render build & deploy. Build command sẽ tự chạy `prisma migrate deploy` mỗi lần deploy nên schema luôn đồng bộ.
6. Sau khi deploy thành công, vào tab **Shell** của service và chạy lần đầu để seed admin/staff:
   ```bash
   npm run seed
   ```
7. URL backend dạng `https://laundry-qr-backend.onrender.com`. Health check: `/api/health`.

**Lưu ý Free plan**: sau ~15 phút không có request, instance bị sleep → request đầu tiên sau đó sẽ chậm (~30-60s wake-up). Lên `Starter` ($7/tháng) để always-on.
