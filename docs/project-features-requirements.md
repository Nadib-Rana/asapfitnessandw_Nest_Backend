# Project Features and Requirements

## 1. Document Purpose

This document defines the full project scope in terms of features and requirements for the ASAP Fitness backend.

It is intended for:

- product owners
- frontend/mobile developers
- backend developers
- QA and test engineers
- DevOps/release engineers

## 2. Product Scope

The backend provides APIs for:

- authentication and account verification
- LMS enrollment and class progress tracking
- e-commerce catalog and cart
- order and payment lifecycle
- media/object storage using MinIO-compatible S3 APIs
- role-based admin operations for vendor/staff users

## 3. Roles and Responsibility

- `customer`
  - registration, login, reset password
  - browse LMS (based on enrollment)
  - use cart and checkout
  - view own orders
- `vendor`
  - manage LMS categories
  - manage shop categories/products
  - view all orders (admin endpoint)
  - access vendor storage admin endpoints
  - can confirm COD orders
- `staff`
  - can confirm COD orders

## 4. Functional Features

## 4.1 Auth and User Access

Implemented capabilities:

- register user with role and optional profile image key
- email OTP verification
- resend OTP
- login by email or phone
- JWT-based authenticated session
- request password reset
- reset password by token
- logout endpoint

Requirements:

- all auth DTO validations must pass strict global validation
- JWT token is required for protected APIs
- auth responses follow standardized API response contract

## 4.2 LMS and Enrollment

Implemented capabilities:

- list categories via `GET /lms/categories`
- list classes by category via `GET /lms/classes`
- create enrollment via `POST /enrollments`
- get active enrollment via `GET /enrollments/active`
- update class progress via `PATCH /enrollments/:enrollmentId/classes/:classId/progress`
- linear lock behavior enforced by previous class completion
- milestone support (50% / 75%) in progress data
- vendor CRUD for LMS categories

Requirements:

- customer LMS access requires an active enrollment
- enrollment create must satisfy bundle/category business rules
- class progression must preserve sequential learning lock
- progress persistence must support resume behavior

## 4.3 Shop and Cart

Implemented capabilities:

- public category and product listing
- persistent cart (add/update/remove/get)
- stock and product-active checks on cart operations
- vendor admin category CRUD
- vendor admin product CRUD

Requirements:

- product filters support category/search/active state
- cart integrity must prevent quantities above stock
- category/product admin operations must be vendor-protected
- pricing supports regular and discount price fields

## 4.4 Orders and Payments

Implemented capabilities:

- checkout via COD and SQUARE payment methods
- customer order history endpoint
- Square webhook endpoint for payment state transitions
- idempotent handling for already-paid webhook events
- stock deduction during paid/confirmed flow
- admin order listing for vendor
- COD confirm endpoint for staff/vendor

Requirements:

- checkout must fail for invalid/empty cart state
- SQUARE checkout requires transaction identifier
- webhook event handling must be tolerant to retries/duplicates
- order/payment statuses must remain consistent with stock mutations

## 4.5 Storage and Media

Implemented capabilities:

- presigned upload/download for authenticated flows
- public temporary presigned upload for pre-registration
- multipart backend upload endpoint for public temporary media
- object URL generation endpoint
- object delete endpoint
- vendor admin variants for storage management routes
- support for `STORAGE_*` and fallback `MINIO_*` environment keys

Requirements:

- temporary public uploads must enforce safe key policy
- storage responses should expose object key and access metadata
- object keys are primary persisted media references
- transformed/public or presigned URLs can be generated at read time

## 5. API and Contract Requirements

- all endpoints return standardized success/error wrappers
- request validation uses global `ValidationPipe` with:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`
- role-protected endpoints must use guard + role metadata
- API behavior and payloads must remain documented in `docs/api-endpoints.md`

## 6. Security and Access Requirements

- JWT for protected routes
- role-based guards for vendor/staff operations
- no direct permanent public media URLs for protected objects
- safe object-key validation for public upload endpoints
- webhook endpoint validation must ensure identifier presence

## 7. Data and Persistence Requirements

- PostgreSQL is the system of record
- Prisma models manage schema and relations
- required domains:
  - users/auth tokens
  - LMS categories/classes/progress
  - enrollment lifecycle
  - products/categories/cart
  - orders/order items/payment states
- object storage keys (not binary blobs) are stored in relational records

## 8. Operational Requirements

- service must run in local development with:
  - PostgreSQL
  - MinIO
  - Redis (available in compose)
- migrations and Prisma client generation must be part of setup
- mail transport settings are required for OTP/reset email flows
- app should support containerized runtime via Dockerfile

## 9. Testing Requirements

Current test coverage includes:

- controller-level unit tests for LMS/Shop/Order/Storage/Enrollment
- service-level tests for critical business logic
- webhook idempotency scenarios
- scheduler integration paths for enrollment reminder processing
- e2e harness and representative route tests

Recommended ongoing requirements:

- continue expanding role-guard forbidden-flow e2e coverage
- continue expanding DTO validation error-shape e2e coverage
- keep test cases synchronized with any new endpoint or role changes

## 10. Documentation Requirements

Required documentation set:

- `README.md` for setup and system overview
- `docs/api-endpoints.md` for complete endpoint usage
- `docs/project-features-requirements.md` for scope/requirements baseline
- Postman collection and environment under `docs/`
- `docs/work-tracking.md` for implementation history and progress

Change-management rule:

- whenever features, payloads, roles, or behavior change, documentation must be updated in the same change set.

## 11. Known Compatibility Note

- runtime DB may include legacy auth column naming; service mapping currently preserves compatibility while API DTO names remain stable.
