# ⚽ ĐẶC TẢ KIẾN TRÚC KỸ THUẬT TOÀN HỆ THỐNG (SYSTEM SPECIFICATION)
## HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ THỂ THAO STRIKER

- **Kiến trúc:** Microservices Architecture (Laravel 11 PHP + React 19 TypeScript + MySQL + GHN Logistics + MoMo API)
- **Tập trung nghiệp vụ & Lab chuyên đề:**
  - Lab 7: Hệ thống Tin nhắn Tư vấn trực tuyến (LiveChat Support)
  - Lab 8: Tích hợp Cổng thanh toán MoMo Sandbox (HMAC-SHA256) & Logistics Giao Hàng Nhanh (GHN)
  - **Lab 9: Xử lý, Báo cáo Giao dịch Thanh toán & Đối soát Tài chính (Finance & Transactions Management)**

---

## 1. BẢN ĐỒ MICROSERVICES & CỔNG KẾT NỐI

```
                           ┌─────────────────────────────────────────┐
                           │   crs-frontend (React 19 + TypeScript)  │
                           │              Port: 5173                 │
                           └────────────────────┬────────────────────┘
                                                │ REST API (Bearer JWT / Axios)
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │       api-gateway (Laravel Core)        │
                           │              Port: 8000                 │
                           │   (Reverse Proxy, Rate Limit, Auth Guard)│
                           └───────┬─────┬─────────┬─────────┬───────┘
                                   │     │         │         │
          ┌────────────────────────┘     │         │         └────────────────────────┐
          │                              │         │                                  │
          ▼                              ▼         ▼                                  ▼
┌──────────────────┐  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   auth-service   │  │  catalog-service   │  │  order-service   │  │ payment-service  │  │  External APIs   │
│    Port: 8001    │  │     Port: 8002     │  │    Port: 8003    │  │    Port: 8004    │  │  GHN / MoMo IPN  │
├──────────────────┤  ├────────────────────┤  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ • Users & Admin  │  │ • Categories       │  │ • Orders & Items │  │ • MoMo Payment   │  │ • GHN Shipping   │
│ • User Addresses │  │ • Brands           │  │ • Cart & Items   │  │ • Transactions   │  │   Fee & Tracking │
│ • Live Messages  │  │ • Products & Tags  │  │ • Coupons/Voucher│  │ • Payment Logs   │  │ • MoMo Sandbox   │
│ • JWT / Password │  │ • Variants/Banners │  │ • Product Reviews│  │ • IPN Webhooks   │  │   AIO QR & ATM    │
│ • DB: auth_db    │  │ • DB: catalog_db   │  │ • DB: order_db   │  │ • DB: payment_db │  │                  │
└──────────────────┘  └────────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. ĐẶC TẢ CƠ SỞ DỮ LIỆU CÁC DỊCH VỤ

### 2.1. `striker_auth_db` (Port 8001)
- `users`: `id`, `name`, `email`, `phone`, `password`, `role` (`admin`/`user`), `avatar`, `created_at`
- `addresses`: `id`, `user_id`, `recipient_name`, `phone`, `province_id`, `district_id`, `ward_code`, `street_address`, `is_default`
- `messages`: `id`, `sender_id`, `receiver_id`, `message`, `is_read`, `created_at` (Lab 7)

### 2.2. `striker_catalog_db` (Port 8002)
- `categories`: `id`, `name`, `slug`, `icon`, `is_active`
- `brands`: `id`, `name`, `slug`, `logo`
- `products`: `id`, `category_id`, `brand_id`, `name`, `slug`, `sku`, `price`, `old_price`, `tag` (`HOT`, `NEW`, `BEST_SELLER`), `stock`, `colors`, `sizes`, `deleted_at`
- `product_variants`: `id`, `product_id`, `sku`, `color`, `size`, `stock_quantity`, `price`
- `banners`: `id`, `title`, `image_url`, `link`, `order`, `is_active`

### 2.3. `striker_order_db` (Port 8003)
- `orders`: `id`, `order_code`, `user_id`, `coupon_id`, `shipping_name`, `shipping_phone`, `shipping_address`, `subtotal`, `shipping_fee`, `discount_amount`, `total_amount`, `order_status`, `payment_status`, `created_at`
- `order_items`: `id`, `order_id`, `product_id`, `variant_id`, `product_name`, `variant_attributes`, `unit_price`, `quantity`, `subtotal`
- `coupons`: `id`, `code`, `type` (`percent`/`fixed`/`freeship`), `value`, `min_order_value`, `usage_limit`, `used_count`, `expires_at`
- `reviews`: `id`, `order_id`, `product_id`, `user_id`, `rating`, `comment`, `created_at`
- **`payment_transactions` (Lab 9):**
  - `id`, `order_id` (khóa ngoại `orders.id`), `gateway` (`cod`, `momo`, `unknown`), `amount`, `status` (`pending`, `initiated`, `paid`, `failed`, `cancelled`, `refund_pending`, `refunded`), `message`, `paid_at`, `timestamps`

### 2.4. `striker_payment_db` (Port 8004)
- `payments`: `id`, `order_id`, `payment_method`, `amount`, `status`, `paid_at`
- `payment_logs`: `id`, `payment_id`, `gateway`, `transaction_code`, `response_code`, `amount`, `status`, `raw_payload`

---

## 3. ĐẶC TẢ CHI TIẾT LAB 9: XỬ LÝ & BÁO CÁO GIAO DỊCH TÀI CHÍNH (FINANCE)

### 3.1. Thiết kế Quan hệ Model (Eloquent)
* **Model `Order` (`app/Models/Order.php`):**
  ```php
  public function paymentTransactions()
  {
      return $this->hasMany(PaymentTransaction::class);
  }
  ```
* **Model `PaymentTransaction` (`app/Models/PaymentTransaction.php`):**
  ```php
  public function order(): BelongsTo
  {
      return $this->belongsTo(Order::class);
  }
  ```

### 3.2. Quy tắc Chuyển đổi Trạng thái COD An toàn (State Machine)
```
  [pending] ──────► [paid] ──────► [refund_pending] ──────► [refunded]
      │
      └───────────► [failed]
```
* Bảng ma trận chuyển đổi (`COD_TRANSITIONS`):
  - `pending` ➔ `pending`, `paid`, `failed`
  - `failed` ➔ `failed`, `pending`, `paid`
  - `paid` ➔ `paid`, `refund_pending`
  - `refund_pending` ➔ `refund_pending`, `refunded`
  - `refunded` ➔ `refunded`
  - `cancelled` ➔ `cancelled`

### 3.3. Thuật toán Truy vấn `ordersQuery()`
Ưu tiên nối đơn hàng với một giao dịch đại diện duy nhất (ưu tiên giao dịch đã thu/chờ hoàn/đã hoàn tiền, tránh đếm trùng doanh thu):
```sql
PAYMENT_PRIORITY = "CASE WHEN status IN ('paid', 'refund_pending', 'refunded') THEN 0 ELSE 1 END"
```

### 3.4. Danh sách Endpoints & Routes (Lab 9)

| Phương thức | Đường dẫn Route | Controller & Action | Chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/finance` | `Admin\FinanceController@index` | Báo cáo thống kê tài chính, tổng hợp theo trạng thái và phương thức |
| `GET` | `/admin/finance/transactions` | `Admin\FinanceController@transactions` | Danh sách giao dịch chi tiết, lọc đa tiêu chí, phân trang 15 bản ghi/trang |
| `PATCH`| `/admin/finance/{order}/status` | `Admin\FinanceController@updateStatus` | Cập nhật trạng thái thanh toán COD thủ công có kiểm tra ràng buộc |

---

## 4. BẢO MẬT & ĐỐI SOÁT THANH TOÁN
1. **MoMo HMAC-SHA256:** Ký số toàn vẹn dữ liệu giao dịch chống giả mạo số tiền và ID đơn hàng.
2. **Webhook IPN Idempotency:** Xử lý xác thực chữ ký số ngầm từ MoMo, cập nhật trạng thái `paid` tự động.
3. **Đối soát COD:** Quản trị viên đối soát đơn bưu tá giao thành công, ghi nhận thời gian `paid_at` và ID Admin thao tác.
