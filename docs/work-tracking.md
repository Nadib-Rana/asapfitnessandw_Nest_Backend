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
- Added vendor/admin LMS category CRUD support:
  - `POST /lms/categories`
  - `GET /lms/categories/:categoryId`
  - `PATCH /lms/categories/:categoryId`
  - `DELETE /lms/categories/:categoryId`
  - Role-aware `GET /lms/categories` behavior (`vendor` gets full category list)
- Added vendor/admin class CRUD under LMS categories:
  - `GET /lms/categories/:categoryId/classes`
  - `POST /lms/categories/:categoryId/classes`
  - `GET /lms/categories/:categoryId/classes/:classId`
  - `PATCH /lms/categories/:categoryId/classes/:classId`
  - `DELETE /lms/categories/:categoryId/classes/:classId`
  - Added class-order conflict checks and category `totalClasses` sync after class create/delete
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
- Added vendor/admin Shop management endpoints:
  - `GET /shop/admin/categories`
  - `POST /shop/admin/categories`
  - `PATCH /shop/admin/categories/:categoryId`
  - `DELETE /shop/admin/categories/:categoryId`
  - `GET /shop/admin/products`
  - `POST /shop/admin/products`
  - `PATCH /shop/admin/products/:productId`
  - `DELETE /shop/admin/products/:productId`
- Implemented Order endpoints:
  - `POST /orders/checkout` (COD + SQUARE)
  - `GET /orders/my`
  - `PATCH /orders/:orderId/cod-confirm` (staff)
- Added vendor/admin Order access:
  - `GET /orders/admin`
  - `PATCH /orders/:orderId/cod-confirm` now supports `vendor` role too
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
- Reworked project documentation for full onboarding and usage:
  - Rewrote `README.md` with end-to-end setup, environment variables, role model, scripts, and module overview
  - Rewrote `docs/api-endpoints.md` with complete route index and step-by-step API workflows by role/use-case
- Added complete project scope documentation for stakeholders:
  - Created `docs/project-features-requirements.md` with full feature list and functional/non-functional requirements
  - Linked new requirements document from `README.md`
- Added import-ready Postman assets:
  - `docs/asap-backend.postman_collection.json`
  - `docs/asap-backend.postman_environment.json`
- Implemented complete Storage API endpoints:
  - `POST /storage/presign-upload`
  - `POST /storage/presign-download`
  - `GET /storage/object-url`
  - `DELETE /storage/object`
- Added vendor/admin Storage management endpoints:
  - `POST /storage/admin/presign-upload`
  - `POST /storage/admin/presign-download`
  - `GET /storage/admin/object-url`
  - `DELETE /storage/admin/object`
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
