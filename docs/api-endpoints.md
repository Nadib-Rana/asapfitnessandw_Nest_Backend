# API Endpoints Documentation

## 1. Overview

This file is the complete API guide for the project.

- Base URL (local): `http://localhost:3000`
- Auth header for protected endpoints: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- Content type: `application/json` (except multipart upload route)

## 2. Standard Response Format

### Success

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "requestId": "req-id-or-null",
  "timestamp": "2026-04-15T12:00:00.000Z",
  "path": "/endpoint/path",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation Failed",
  "requestId": "req-id-or-null",
  "timestamp": "2026-04-15T12:00:00.000Z",
  "path": "/endpoint/path",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "email must be an email",
      "field": "email"
    }
  ],
  "instruction": "OPTIONAL",
  "details": {},
  "isVerified": false
}
```

## 3. Endpoint Index (All Routes)

- `GET /`
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-otp`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `GET /users/me`
- `GET /lms/categories`
- `POST /lms/categories`
- `GET /lms/categories/:categoryId`
- `PATCH /lms/categories/:categoryId`
- `DELETE /lms/categories/:categoryId`
- `GET /lms/categories/:categoryId/classes`
- `POST /lms/categories/:categoryId/classes`
- `GET /lms/categories/:categoryId/classes/:classId`
- `PATCH /lms/categories/:categoryId/classes/:classId`
- `DELETE /lms/categories/:categoryId/classes/:classId`
- `GET /lms/classes`
- `POST /enrollments`
- `GET /enrollments/active`
- `PATCH /enrollments/:enrollmentId/classes/:classId/progress`
- `GET /shop/categories`
- `GET /shop/products`
- `GET /shop/admin/categories`
- `POST /shop/admin/categories`
- `PATCH /shop/admin/categories/:categoryId`
- `DELETE /shop/admin/categories/:categoryId`
- `GET /shop/admin/products`
- `POST /shop/admin/products`
- `PATCH /shop/admin/products/:productId`
- `DELETE /shop/admin/products/:productId`
- `GET /shop/cart`
- `POST /shop/cart`
- `PATCH /shop/cart/:itemId`
- `DELETE /shop/cart/:itemId`
- `POST /orders/webhooks/square`
- `POST /orders/checkout`
- `GET /orders/my`
- `GET /orders/admin`
- `PATCH /orders/:orderId/cod-confirm`
- `POST /storage/public/upload-file`
- `POST /storage/public/presign-upload`
- `POST /storage/presign-upload`
- `POST /storage/admin/presign-upload`
- `POST /storage/presign-download`
- `POST /storage/admin/presign-download`
- `GET /storage/object-url`
- `GET /storage/admin/object-url`
- `DELETE /storage/object`
- `DELETE /storage/admin/object`

## 4. Roles and Access

- `public`: no token required
- `authenticated`: valid JWT required
- `vendor`: `JwtAuthGuard + RolesGuard` with role `vendor`
- `staff`: `JwtAuthGuard + RolesGuard` with role `staff`

Role-protected endpoints:

- Vendor:
  - `POST /lms/categories`
  - `GET /lms/categories/:categoryId`
  - `PATCH /lms/categories/:categoryId`
  - `DELETE /lms/categories/:categoryId`
  - `GET /lms/categories/:categoryId/classes`
  - `POST /lms/categories/:categoryId/classes`
  - `GET /lms/categories/:categoryId/classes/:classId`
  - `PATCH /lms/categories/:categoryId/classes/:classId`
  - `DELETE /lms/categories/:categoryId/classes/:classId`
  - `GET /shop/admin/categories`
  - `POST /shop/admin/categories`
  - `PATCH /shop/admin/categories/:categoryId`
  - `DELETE /shop/admin/categories/:categoryId`
  - `GET /shop/admin/products`
  - `POST /shop/admin/products`
  - `PATCH /shop/admin/products/:productId`
  - `DELETE /shop/admin/products/:productId`
  - `GET /orders/admin`
  - `POST /storage/admin/presign-upload`
  - `POST /storage/admin/presign-download`
  - `GET /storage/admin/object-url`
  - `DELETE /storage/admin/object`
- Staff or vendor:
  - `PATCH /orders/:orderId/cod-confirm`

## 5. Step-by-Step API Workflows

This section gives practical call order for frontend/integration teams.

### Flow A: Authentication and Session Setup

1. Register user: `POST /auth/register`
2. Verify OTP: `POST /auth/verify-email`
3. Login: `POST /auth/login`
4. Load signed-in profile: `GET /users/me`
5. Use returned `accessToken` as Bearer token for protected APIs.
6. Optional logout: `POST /auth/logout`

### Flow B: Password Recovery

1. Request reset: `POST /auth/request-password-reset`
2. Submit OTP + new password: `POST /auth/reset-password`

### Flow C: Customer LMS Journey

1. Ensure user has active enrollment; if not, create with `POST /enrollments`
2. Read active enrollment: `GET /enrollments/active`
3. Get available categories: `GET /lms/categories`
4. Get classes for one category: `GET /lms/classes?categoryId=<uuid>`
5. Save watch progress: `PATCH /enrollments/:enrollmentId/classes/:classId/progress`

### Flow D: Customer Shop and Checkout

1. List categories: `GET /shop/categories`
2. List products: `GET /shop/products`
3. Add cart item: `POST /shop/cart`
4. Review cart: `GET /shop/cart`
5. Update quantity if needed: `PATCH /shop/cart/:itemId`
6. Remove unwanted item if needed: `DELETE /shop/cart/:itemId`
7. Checkout COD or SQUARE: `POST /orders/checkout`
8. Check own order history: `GET /orders/my`

### Flow E: Vendor Catalog Management

1. Manage LMS categories:
   - `POST /lms/categories`
   - `GET /lms/categories/:categoryId`
   - `PATCH /lms/categories/:categoryId`
   - `DELETE /lms/categories/:categoryId`
2. Manage classes under category:

- `GET /lms/categories/:categoryId/classes`
- `POST /lms/categories/:categoryId/classes`
- `GET /lms/categories/:categoryId/classes/:classId`
- `PATCH /lms/categories/:categoryId/classes/:classId`
- `DELETE /lms/categories/:categoryId/classes/:classId`

3. Manage shop categories:
   - `GET /shop/admin/categories`
   - `POST /shop/admin/categories`
   - `PATCH /shop/admin/categories/:categoryId`
   - `DELETE /shop/admin/categories/:categoryId`
4. Manage products:
   - `GET /shop/admin/products`
   - `POST /shop/admin/products`
   - `PATCH /shop/admin/products/:productId`
   - `DELETE /shop/admin/products/:productId`

### Flow F: Vendor/Staff Order Operations

1. Vendor full order view: `GET /orders/admin`
2. COD confirmation (vendor or staff): `PATCH /orders/:orderId/cod-confirm`

### Flow G: Storage and Media

Public pre-registration upload options:

1. Direct multipart upload: `POST /storage/public/upload-file`
2. Or get presigned URL first: `POST /storage/public/presign-upload`

Authenticated storage options:

1. Presigned upload: `POST /storage/presign-upload`
2. Presigned download: `POST /storage/presign-download`
3. Object URL generation: `GET /storage/object-url`
4. Delete object: `DELETE /storage/object`

Vendor storage admin equivalents:

1. `POST /storage/admin/presign-upload`
2. `POST /storage/admin/presign-download`
3. `GET /storage/admin/object-url`
4. `DELETE /storage/admin/object`

### Flow H: Square Webhook Handling

1. Payment provider calls `POST /orders/webhooks/square`
2. Provide `eventType` and either `squareTransactionId` or `orderId`
3. Backend updates payment/order status idempotently

## 6. Module-Wise Endpoint Reference

## Root

### GET `/`

- Access: public
- Purpose: basic service status text

## Auth (`/auth`)

### POST `/auth/register`

- Access: public
- Body:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "017xxxxxxxx",
  "password": "secret123",
  "avatarKey": "profiles/users/u1/avatar.jpg",
  "role": "customer",
  "age": 28,
  "gender": "male"
}
```

### POST `/auth/verify-email`

- Access: public
- Body:

```json
{
  "token": "123456"
}
```

### POST `/auth/resend-otp`

- Access: public
- Body:

```json
{
  "email": "john@example.com"
}
```

### POST `/auth/login`

- Access: public
- Body (email):

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

- Body (phone):

```json
{
  "phone": "017xxxxxxxx",
  "password": "secret123"
}
```

### POST `/auth/logout`

- Access: authenticated

### POST `/auth/request-password-reset`

- Access: public
- Body:

```json
{
  "email": "john@example.com"
}
```

### POST `/auth/reset-password`

- Access: public
- Body:

```json
{
  "token": "123456",
  "newPassword": "newSecret123"
}
```

## LMS (`/lms`)

### GET `/lms/categories`

- Access: authenticated
- Behavior:
  - `vendor`: returns full category list for admin use
  - others: returns enrollment-access categories

### POST `/lms/categories`

- Access: vendor
- Body:

```json
{
  "title": "Strength",
  "description": "Strength training for beginners",
  "thumbnailKey": "lms/categories/strength.jpg"
}
```

### GET `/lms/categories/:categoryId`

- Access: vendor

### PATCH `/lms/categories/:categoryId`

- Access: vendor
- Body (any updatable field):

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "thumbnailKey": "lms/categories/updated.jpg"
}
```

### DELETE `/lms/categories/:categoryId`

- Access: vendor

### GET `/lms/categories/:categoryId/classes`

- Access: vendor

### POST `/lms/categories/:categoryId/classes`

- Access: vendor
- Body:

```json
{
  "classOrder": 1,
  "title": "Warm-up and Mobility",
  "subtitle": "Session 1",
  "videoKey": "lms/videos/warmup-1.mp4",
  "thumbKey": "lms/thumbs/warmup-1.jpg",
  "durationSeconds": 600
}
```

### GET `/lms/categories/:categoryId/classes/:classId`

- Access: vendor

### PATCH `/lms/categories/:categoryId/classes/:classId`

- Access: vendor
- Body (any updatable field):

```json
{
  "classOrder": 2,
  "title": "Updated title",
  "durationSeconds": 720
}
```

### DELETE `/lms/categories/:categoryId/classes/:classId`

- Access: vendor

### GET `/lms/classes?categoryId=<uuid>`

- Access: authenticated
- Query:
  - `categoryId` (required UUID)

## Enrollments (`/enrollments`)

### POST `/enrollments`

- Access: authenticated
- Body:

```json
{
  "categoryIds": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333"
  ],
  "expiresAt": "2026-05-15T00:00:00.000Z"
}
```

### GET `/enrollments/active`

- Access: authenticated

### PATCH `/enrollments/:enrollmentId/classes/:classId/progress`

- Access: authenticated
- Body:

```json
{
  "lastWatchedSeconds": 120,
  "progressPercent": 60
}
```

## Shop (`/shop`)

### GET `/shop/categories`

- Access: public

### GET `/shop/products`

- Access: public
- Query (optional):
  - `categoryId`
  - `search`
  - `onlyActive`

### GET `/shop/admin/categories`

- Access: vendor

### POST `/shop/admin/categories`

- Access: vendor
- Body:

```json
{
  "name": "Supplements"
}
```

### PATCH `/shop/admin/categories/:categoryId`

- Access: vendor
- Body:

```json
{
  "name": "Fitness Gear"
}
```

### DELETE `/shop/admin/categories/:categoryId`

- Access: vendor

### GET `/shop/admin/products`

- Access: vendor

### POST `/shop/admin/products`

- Access: vendor
- Body:

```json
{
  "categoryId": "11111111-1111-1111-1111-111111111111",
  "title": "Resistance Band",
  "regularPrice": 19.99,
  "discountPrice": 15.99,
  "stockQuantity": 50,
  "imageKey": "products/band.jpg",
  "isActive": true
}
```

### PATCH `/shop/admin/products/:productId`

- Access: vendor
- Body (any updatable field):

```json
{
  "stockQuantity": 40,
  "discountPrice": 14.99,
  "isActive": true
}
```

### DELETE `/shop/admin/products/:productId`

- Access: vendor

### GET `/shop/cart`

- Access: authenticated

### POST `/shop/cart`

- Access: authenticated
- Body:

```json
{
  "productId": "11111111-1111-1111-1111-111111111111",
  "quantity": 2
}
```

### PATCH `/shop/cart/:itemId`

- Access: authenticated
- Body:

```json
{
  "quantity": 3
}
```

### DELETE `/shop/cart/:itemId`

- Access: authenticated

## Orders (`/orders`)

### POST `/orders/webhooks/square`

- Access: public webhook
- Body example:

```json
{
  "eventType": "PAYMENT_SUCCEEDED",
  "squareTransactionId": "sq_txn_abc123"
}
```

Or:

```json
{
  "eventType": "PAYMENT_FAILED",
  "orderId": "11111111-1111-1111-1111-111111111111"
}
```

### POST `/orders/checkout`

- Access: authenticated
- Body COD:

```json
{
  "paymentMethod": "COD"
}
```

- Body SQUARE:

```json
{
  "paymentMethod": "SQUARE",
  "squareTransactionId": "sq_txn_abc123"
}
```

### GET `/orders/my`

- Access: authenticated

### GET `/orders/admin`

- Access: vendor

### PATCH `/orders/:orderId/cod-confirm`

- Access: staff or vendor

## Storage (`/storage`)

### POST `/storage/public/upload-file`

- Access: public
- Content type: `multipart/form-data`
- Form fields:
  - file (required)
  - `key` (optional)
  - `filename` (optional)
  - `mimeType` (optional)
  - `bucket` (optional)

### POST `/storage/public/presign-upload`

- Access: public
- Body option 1:

```json
{
  "filename": "avatar.jpg",
  "mimeType": "image/jpeg",
  "bucket": "profiles",
  "expirySeconds": 600
}
```

- Body option 2:

```json
{
  "key": "temp/registrations/avatar-123.jpg",
  "bucket": "profiles",
  "expirySeconds": 600
}
```

### POST `/storage/presign-upload`

- Access: authenticated
- Body:

```json
{
  "key": "products/items/item-1.jpg",
  "bucket": "products",
  "expirySeconds": 900
}
```

### POST `/storage/admin/presign-upload`

- Access: vendor

### POST `/storage/presign-download`

- Access: authenticated
- Body:

```json
{
  "key": "products/items/item-1.jpg",
  "bucket": "products",
  "expirySeconds": 900
}
```

### POST `/storage/admin/presign-download`

- Access: vendor

### GET `/storage/object-url?key=<key>&bucket=<bucket>`

- Access: authenticated

### GET `/storage/admin/object-url?key=<key>&bucket=<bucket>`

- Access: vendor

### DELETE `/storage/object`

- Access: authenticated
- Body:

```json
{
  "key": "products/items/item-1.jpg",
  "bucket": "products"
}
```

### DELETE `/storage/admin/object`

- Access: vendor

## Users (`/users`)

### GET `/users/me`

- Access: authenticated
- Purpose: return currently logged-in user profile information from JWT user id
- Response `data` shape:

```json
{
  "id": "2b0ef30d-5d65-446f-a6b2-5a5d79ae1e2a",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "017xxxxxxxx",
  "role": "customer",
  "age": 28,
  "gender": "male",
  "avatarUrl": "https://storage.example.com/profiles/users/u1/avatar.jpg",
  "isVerified": true,
  "createdAt": "2026-04-20T08:30:00.000Z"
}
```

## 7. Client Notes

- Parse standardized wrapper fields (`success`, `statusCode`, `message`, `data`) on every response.
- Keep `requestId` for support/debug traceability.
- User profile endpoint (`GET /users/me`) returns `avatarUrl` directly.
- For media key fields (`videoKey`, `thumbKey`, `imageKey`), URL values may be transformed by interceptors.
- Enrollment expiry reminder job updates retry/error state in DB.
