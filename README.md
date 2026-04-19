# ASAP Fitness Backend (NestJS)

Backend API for the ASAP Fitness platform, covering authentication, LMS enrollment/progress, e-commerce cart and checkout, order management, and MinIO-based storage.

## 1. Project Overview

This service provides:

- Auth with OTP verification and password reset
- LMS category/class access controlled by active enrollment
- Enrollment progress tracking with linear class lock behavior
- Shop catalog, persistent cart, and checkout flow (COD + SQUARE)
- Order lifecycle APIs including webhook-driven payment updates
- Storage APIs for public temporary uploads and protected object operations
- Role-based admin routes for vendor/staff operations

## 2. Tech Stack

- Runtime: NestJS 11, TypeScript
- Database: PostgreSQL + Prisma ORM
- Object storage: MinIO (S3-compatible)
- Auth: JWT + Passport
- Validation: class-validator + global ValidationPipe
- Email: @nestjs-modules/mailer + Handlebars templates
- Tests: Jest (unit + e2e harness)

## 3. Modules

- `auth`: register/login/verify/reset
- `lms`: categories/classes and vendor category management
- `enrollment`: create active enrollment and class progress updates
- `shop`: public catalog + customer cart + vendor admin product/category CRUD
- `order`: checkout, user order history, webhook, vendor/staff order ops
- `storage`: public pre-registration upload helpers and authenticated storage ops
- `common`: global error/response wrappers, interceptors, middleware, context

## 4. Role Model

- `customer`: default product user flows
- `vendor`: LMS category admin, shop admin CRUD, order admin list, storage admin routes
- `staff`: order COD confirmation

## 5. Prerequisites

- Node.js 20+
- Bun (project scripts use bun)
- Docker + Docker Compose
- PostgreSQL/MinIO/Redis can be run via `docker-compose.yml`

## 6. Local Setup (Step by Step)

1. Install dependencies:

```bash
bun install
```

2. Start infrastructure services:

```bash
docker compose up -d
```

3. Create `.env` in project root (example below).

4. Generate Prisma client:

```bash
bun run db:generate
```

5. Apply migrations:

```bash
bun run db:migrate
```

6. Run the API:

```bash
bun run start:dev
```

7. Verify health route:

```bash
curl http://localhost:3000/
```

## 7. Environment Variables

Set these in `.env`:

### Core

- `PORT=3000`
- `NODE_ENV=development`
- `DATABASE_URL=postgresql://<user>:<pass>@localhost:6098/<db>?schema=public`
- `JWT_SECRET=<your_jwt_secret>`

### Mail

- `MAIL_HOST=<smtp_host>`
- `MAIL_PORT=<smtp_port>`
- `MAIL_USER=<smtp_user>`
- `MAIL_PASS=<smtp_password>`
- `MAIL_FROM=<from_email>`

### Storage (Primary names)

- `STORAGE_ENDPOINT=localhost`
- `STORAGE_PORT=9030`
- `STORAGE_USE_SSL=false`
- `STORAGE_ACCESS_KEY=<minio_access_key>`
- `STORAGE_SECRET_KEY=<minio_secret_key>`
- `STORAGE_DEFAULT_BUCKET=media`
- `STORAGE_PUBLIC_URL=http://localhost:9030`
- `STORAGE_PRESIGNED_EXPIRY_SECONDS=900`
- `STORAGE_PUBLIC_UPLOAD_PREFIX=temp/registrations/`
- `STORAGE_PUBLIC_UPLOAD_BUCKET=profiles`

### Storage legacy-compatible fallback names

The code also supports `MINIO_*` equivalents:

- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_URL`

## 8. Useful Scripts

- `bun run start:dev`: run in watch mode
- `bun run build`: build project
- `bun run test`: run unit tests
- `bun run test:e2e`: run e2e tests
- `bun run db:generate`: generate Prisma client
- `bun run db:migrate`: create/apply local migration
- `bun run db:migrate:prod`: deploy migrations
- `bun run db:reset`: reset database
- `bun run db:studio`: open Prisma Studio

## 9. API Documentation

- Full endpoint reference: `docs/api-endpoints.md`
- Full project features and requirements: `docs/project-features-requirements.md`
- Postman collection: `docs/asap-backend.postman_collection.json`
- Postman environment: `docs/asap-backend.postman_environment.json`
- Work log and progress notes: `docs/work-tracking.md`

## 10. Response Contract

Successful responses are wrapped by the global response interceptor.

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

Errors are standardized by the global exception filter.

## 11. Notes

- DTO validation is strict (`whitelist`, `forbidNonWhitelisted`, `transform`).
- Media/object key fields can be transformed into URL output via interceptor logic.
- Runtime DB may still use legacy auth column names; current service layer handles compatibility mappings.
