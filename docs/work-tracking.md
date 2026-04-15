# Work Tracking

## Date

- 2026-04-15

## Completed

- Expanded Prisma schema for LMS, enrollment, shop, order, and user auth fields.
- Refactored auth registration/login/password reset for new user fields and OTP delivery tracking.
- Added MinIO presigned URL support in storage service.
- Updated global image/media transformation interceptor to map object keys to presigned URLs.
- Scaffolded modules: users, lms, enrollment, shop, order.
- Implemented LMS endpoints:
  - `GET /lms/categories`
  - `GET /lms/classes?categoryId=<uuid>`
- Implemented Enrollment endpoints:
  - `POST /enrollments`
  - `GET /enrollments/active`
  - `PATCH /enrollments/:enrollmentId/classes/:classId/progress`
- Added linear class lock logic and milestone/category progress persistence.
- Implemented Shop catalog and cart endpoints:
  - `GET /shop/categories`
  - `GET /shop/products`
  - `GET /shop/cart`
  - `POST /shop/cart`
  - `PATCH /shop/cart/:itemId`
  - `DELETE /shop/cart/:itemId`
- Implemented Order endpoints:
  - `POST /orders/checkout` (COD + SQUARE)
  - `GET /orders/my`
  - `PATCH /orders/:orderId/cod-confirm` (staff)
- Added Square webhook endpoint:
  - `POST /orders/webhooks/square`
  - Handles `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED`, `PAYMENT_CANCELED`
  - Includes idempotent handling for already-paid orders
- Added enrollment expiry reminder scheduler with retry/error tracking.
- Added order service unit tests for Square webhook validation and idempotency.
- Added shop service tests for cart subtotal and stock validation.
- Added enrollment service tests for bundle validation, class lock enforcement, and milestone progress update.
- Added controller-level tests for Shop routes and handler wiring.
- Added controller-level tests for Order routes including Square webhook handling path.
- Added controller-level tests for LMS routes.
- Added controller-level tests for Enrollment routes.
- Added initial e2e test harness (`test/jest-e2e.json`) with supertest route wiring tests.
- Added route-level e2e tests for representative endpoints:
  - `GET /shop/categories`
  - `POST /orders/webhooks/square`
  - `GET /lms/categories`
  - `PATCH /enrollments/:enrollmentId/classes/:classId/progress`
- Added e2e assertions for standardized API success/error response contracts (global interceptor + global exception filter).
- Added scheduler integration tests for enrollment expiry reminder processing and retry failure flow.
- Added complete API endpoint reference documentation in `docs/api-endpoints.md`.
- Added import-ready Postman assets:
  - `docs/asap-backend.postman_collection.json`
  - `docs/asap-backend.postman_environment.json`
- Implemented complete Storage API endpoints:
  - `POST /storage/presign-upload`
  - `POST /storage/presign-download`
  - `GET /storage/object-url`
  - `DELETE /storage/object`
- Added storage module/controller/DTOs and wired module into `AppModule`.
- Updated API docs and Postman assets with storage routes and variables (`storageKey`, `storageBucket`).
- Added public temporary storage upload endpoint for pre-registration avatar flow:
  - `POST /storage/public/presign-upload` (no auth)
  - Enforced key prefix and key safety checks
  - Added env-driven controls: `STORAGE_PUBLIC_UPLOAD_PREFIX`, `STORAGE_PUBLIC_UPLOAD_BUCKET`
  - Synced API docs and Postman variables for this route
- Added automatic key generation for pre-registration uploads:
  - `POST /storage/public/presign-upload` now supports `filename` + `mimeType`
  - Server generates safe key with prefix + timestamp + random suffix
  - Backward compatible: explicit `key` input still supported
- Added backend multipart file upload support for pre-registration:
  - `POST /storage/public/upload-file` accepts `multipart/form-data`
  - Backend stores file directly in MinIO and returns `key` / `objectKey`
  - `multipart/form-data` flow is now documented and covered by controller tests
- Stabilized multipart upload behavior for frontend integration:
  - Endpoint now accepts any uploaded file field name and uses the first file
  - Added and verified docs for the recommended pattern: store `objectKey` in DB, return actual URL on read

## In Progress

- Expanding e2e coverage depth (validation pipe and guard-specific behavior assertions).

## Next

- Add e2e tests for global validation pipe error format on DTO-invalid requests.
- Add e2e tests for role-guard forbidden flow on staff-protected routes.
- Keep `docs/api-endpoints.md` updated as new endpoints/DTOs are introduced.
- Keep Postman collection/environment files in sync with endpoint changes.

## Notes

- Media URL transformation uses presigned URLs when MinIO credentials are configured; otherwise falls back to public object URL builder.
- Enrollment create enforces exactly 3 unique categories to match blueprint rules.
