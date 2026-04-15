# API Endpoints Documentation

## Overview

This document lists all currently implemented API endpoints in the NestJS backend.

- Base URL (local): `http://localhost:3000`
- Auth scheme: `Bearer <JWT_ACCESS_TOKEN>`
- Content type: `application/json`

## Endpoint Index

This index is generated from current controller routes in `src/**/*controller.ts`.

- `GET /`
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-otp`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `GET /lms/categories`
- `GET /lms/classes`
- `POST /enrollments`
- `GET /enrollments/active`
- `PATCH /enrollments/:enrollmentId/classes/:classId/progress`
- `GET /shop/categories`
- `GET /shop/products`
- `GET /shop/cart`
- `POST /shop/cart`
- `PATCH /shop/cart/:itemId`
- `DELETE /shop/cart/:itemId`
- `POST /orders/webhooks/square`
- `POST /orders/checkout`
- `GET /orders/my`
- `PATCH /orders/:orderId/cod-confirm`
- `POST /storage/presign-upload`
- `POST /storage/presign-download`
- `GET /storage/object-url`
- `DELETE /storage/object`

## Standard API Response

All successful endpoints are wrapped by `ResponseStandardizationInterceptor`.

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

## Standard API Error Response

All errors are wrapped by `AllExceptionsFilter`.

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

## Authentication

Use this header for protected routes:

```http
Authorization: Bearer <access_token>
```

## Roles

Some routes require `staff` role via `RolesGuard` + `@Roles("staff")`.

---

## Root

### GET `/`

Get hello/status message from app service.

- Auth: No
- Body: None
- Success message: `Hello ASAP!`

---

## Auth Module (`/auth`)

### POST `/auth/register`

Register a new user and trigger verification OTP email.

- Auth: No
- Body:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "017xxxxxxxx",
  "password": "secret123",
  "avatarKey": "profiles/users/u1/avatar.jpg",
  "role": "customer",
  "referralCode": "REF100",
  "ref": "campaign-a"
}
```

- Validation:
  - `fullName`: string (required)
  - `email`: valid email (required)
  - `phoneNumber`: string (optional)
  - `password`: min length 6 (required)
  - `avatarKey`: string (optional)
  - `role`: `customer | vendor` (required)

### POST `/auth/verify-email`

Verify registration OTP.

- Auth: No
- Body:

```json
{
  "token": "123456"
}
```

### POST `/auth/resend-otp`

Resend email verification OTP.

- Auth: No
- Body:

```json
{
  "email": "john@example.com"
}
```

### POST `/auth/login`

Login with email or phone + password.

- Auth: No
- Body:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Or:

```json
{
  "phone": "017xxxxxxxx",
  "password": "secret123"
}
```

### POST `/auth/logout`

Logout current authenticated user.

- Auth: Yes
- Body: None

### POST `/auth/request-password-reset`

Request password reset OTP.

- Auth: No
- Body:

```json
{
  "email": "john@example.com"
}
```

### POST `/auth/reset-password`

Reset password using OTP.

- Auth: No
- Body:

```json
{
  "token": "123456",
  "newPassword": "newSecret123"
}
```

---

## LMS Module (`/lms`)

All LMS routes require authentication.

### GET `/lms/categories`

Get categories accessible by current user's active enrollment.

- Auth: Yes
- Body: None

### GET `/lms/classes?categoryId=<uuid>`

Get ordered classes for a category, including lock/progress context.

- Auth: Yes
- Query:
  - `categoryId` (UUID v4, required)

---

## Enrollment Module (`/enrollments`)

All enrollment routes require authentication.

### POST `/enrollments`

Create enrollment for current user.

- Auth: Yes
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

- Validation:
  - `categoryIds`: array of exactly 3 UUIDs
  - `expiresAt`: ISO datetime (optional)

### GET `/enrollments/active`

Get current active enrollment with categories and progress snapshot.

- Auth: Yes
- Body: None

### PATCH `/enrollments/:enrollmentId/classes/:classId/progress`

Update watch progress for a class.

- Auth: Yes
- Path params:
  - `enrollmentId`: UUID
  - `classId`: UUID
- Body:

```json
{
  "lastWatchedSeconds": 120,
  "progressPercent": 60
}
```

- Validation:
  - `lastWatchedSeconds`: integer >= 0 (optional)
  - `progressPercent`: integer 0..100 (optional)

---

## Shop Module (`/shop`)

### GET `/shop/categories`

List product categories.

- Auth: No

### GET `/shop/products`

List products with optional filters.

- Auth: No
- Query:
  - `categoryId` (UUID, optional)
  - `search` (string, optional)
  - `onlyActive` (`"true" | "false"`, optional)

Example:

```http
GET /shop/products?categoryId=11111111-1111-1111-1111-111111111111&search=whey&onlyActive=true
```

### GET `/shop/cart`

Get authenticated user's persistent cart and subtotal.

- Auth: Yes

### POST `/shop/cart`

Add or upsert a cart item.

- Auth: Yes
- Body:

```json
{
  "productId": "11111111-1111-1111-1111-111111111111",
  "quantity": 2
}
```

- Validation:
  - `productId`: UUID
  - `quantity`: integer 1..100

### PATCH `/shop/cart/:itemId`

Update cart item quantity.

- Auth: Yes
- Path params:
  - `itemId`: cart item id
- Body:

```json
{
  "quantity": 3
}
```

### DELETE `/shop/cart/:itemId`

Remove a cart item.

- Auth: Yes
- Path params:
  - `itemId`: cart item id

---

## Order Module (`/orders`)

### POST `/orders/webhooks/square`

Square payment webhook callback.

- Auth: No (webhook endpoint)
- Body:

```json
{
  "eventType": "PAYMENT_SUCCEEDED",
  "squareTransactionId": "sq_txn_abc123"
}
```

Or by order id:

```json
{
  "eventType": "PAYMENT_FAILED",
  "orderId": "11111111-1111-1111-1111-111111111111"
}
```

- Validation:
  - `eventType`: `PAYMENT_SUCCEEDED | PAYMENT_FAILED | PAYMENT_CANCELED`
  - `squareTransactionId`: string (optional)
  - `orderId`: UUID (optional)
  - at least one identifier is required by service logic

### POST `/orders/checkout`

Create order from authenticated user's cart.

- Auth: Yes
- Body:

```json
{
  "paymentMethod": "COD"
}
```

Or:

```json
{
  "paymentMethod": "SQUARE",
  "squareTransactionId": "sq_txn_abc123"
}
```

- Validation:
  - `paymentMethod`: `COD | SQUARE`
  - `squareTransactionId`: optional in DTO, but required by service when `SQUARE`

### GET `/orders/my`

List authenticated user's orders.

- Auth: Yes

### PATCH `/orders/:orderId/cod-confirm`

Mark COD order as paid and confirm it.

- Auth: Yes
- Role: `staff`
- Path params:
  - `orderId`: UUID

---

## Storage Module (`/storage`)

All storage routes require authentication.

### POST `/storage/presign-upload`

Create a presigned upload URL for direct object upload.

- Auth: Yes
- Body:

```json
{
  "key": "products/items/item-1.jpg",
  "bucket": "products",
  "expirySeconds": 900
}
```

- Validation:
  - `key`: string (required)
  - `bucket`: string (optional; defaults to `STORAGE_DEFAULT_BUCKET`)
  - `expirySeconds`: integer 60..86400 (optional)

### POST `/storage/presign-download`

Create a presigned download URL for an object key.

- Auth: Yes
- Body:

```json
{
  "key": "products/items/item-1.jpg",
  "bucket": "products",
  "expirySeconds": 900
}
```

### GET `/storage/object-url?key=<key>&bucket=<bucket>`

Get a direct/public object URL (useful for non-signed access patterns).

- Auth: Yes
- Query:
  - `key` (required)
  - `bucket` (optional)

### DELETE `/storage/object`

Delete object from storage bucket.

- Auth: Yes
- Body:

```json
{
  "key": "products/items/item-1.jpg",
  "bucket": "products"
}
```

---

## Users Module (`/users`)

Controller exists but currently no implemented routes.

---

## Notes for Clients

- Always parse wrapper fields (`success`, `statusCode`, `message`, `data`) instead of assuming raw payload.
- Use `requestId` for support/debug traceability.
- For media fields (e.g. `avatarKey`, `videoKey`, `thumbKey`, `imageKey`), responses may include transformed URL fields from the image/media interceptor.
- Enrollment expiry reminders run via scheduler and update retry/error status in DB.
