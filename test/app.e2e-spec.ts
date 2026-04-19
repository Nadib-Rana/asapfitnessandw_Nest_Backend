import {
  INestApplication,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ShopController } from "../src/shop/shop.controller";
import { OrderController } from "../src/order/order.controller";
import { LmsController } from "../src/lms/lms.controller";
import { EnrollmentController } from "../src/enrollment/enrollment.controller";
import { ShopService } from "../src/shop/shop.service";
import { OrderService } from "../src/order/order.service";
import { LmsService } from "../src/lms/lms.service";
import { EnrollmentService } from "../src/enrollment/enrollment.service";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../src/auth/guards/roles.guard";
import { ContextService } from "../src/common/context/context.service";
import { Reflector, HttpAdapterHost } from "@nestjs/core";
import { ResponseStandardizationInterceptor } from "../src/common/interceptors/response-standardization.interceptor";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { BadRequestException } from "../src/common/exceptions/http.exceptions";

class AllowAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = { userId: "u1", role: "staff" };
    return true;
  }
}

describe("App E2E (Route Wiring)", () => {
  let app: INestApplication;

  const contextServiceMock = {
    getRequestId: jest.fn().mockReturnValue("req-e2e-1"),
  };

  const shopServiceMock = {
    listCategories: jest
      .fn()
      .mockResolvedValue([{ id: "cat-1", name: "Supplements" }]),
    listProducts: jest.fn().mockResolvedValue([{ id: "p1", title: "Whey" }]),
    getCart: jest.fn().mockResolvedValue({ items: [], subtotal: 0 }),
    addToCart: jest.fn().mockResolvedValue({ id: "ci-1" }),
    updateCartItem: jest.fn().mockResolvedValue({ id: "ci-1", quantity: 2 }),
    removeCartItem: jest.fn().mockResolvedValue({ id: "ci-1" }),
  };

  const orderServiceMock = {
    handleSquarePaymentWebhook: jest.fn().mockResolvedValue({ id: "o1" }),
    checkout: jest.fn().mockResolvedValue({ id: "o2" }),
    listMyOrders: jest.fn().mockResolvedValue([{ id: "o2" }]),
    confirmCodOrder: jest
      .fn()
      .mockResolvedValue({ id: "o3", paymentStatus: "PAID" }),
  };

  const lmsServiceMock = {
    listAccessibleCategories: jest.fn().mockResolvedValue({ categories: [] }),
    listCategoryClasses: jest.fn().mockResolvedValue({ classes: [] }),
  };

  const enrollmentServiceMock = {
    createEnrollment: jest.fn().mockResolvedValue({ id: "enr-1" }),
    getActiveEnrollment: jest.fn().mockResolvedValue({ id: "enr-1" }),
    updateClassProgress: jest
      .fn()
      .mockResolvedValue({ progress: { id: "cp-1" } }),
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [
        ShopController,
        OrderController,
        LmsController,
        EnrollmentController,
      ],
      providers: [
        { provide: ShopService, useValue: shopServiceMock },
        { provide: OrderService, useValue: orderServiceMock },
        { provide: LmsService, useValue: lmsServiceMock },
        { provide: EnrollmentService, useValue: enrollmentServiceMock },
        { provide: ContextService, useValue: contextServiceMock },
      ],
    });

    moduleBuilder.overrideGuard(JwtAuthGuard).useValue(new AllowAuthGuard());
    moduleBuilder.overrideGuard(RolesGuard).useValue(new AllowAuthGuard());

    const moduleRef = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    const reflector = app.get(Reflector);
    const contextService = app.get(ContextService);
    const httpAdapterHost = app.get(HttpAdapterHost);

    app.useGlobalInterceptors(
      new ResponseStandardizationInterceptor(contextService, reflector),
    );
    app.useGlobalFilters(
      new AllExceptionsFilter(httpAdapterHost, contextService),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /shop/categories", async () => {
    const res = await request(app.getHttpServer()).get("/shop/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.path).toBe("/shop/categories");
    expect(res.body.requestId).toBe("req-e2e-1");
    expect(res.body.data).toEqual([{ id: "cat-1", name: "Supplements" }]);
  });

  it("POST /orders/webhooks/square", async () => {
    const payload = {
      eventType: "PAYMENT_SUCCEEDED",
      squareTransactionId: "txn-1",
    };
    const res = await request(app.getHttpServer())
      .post("/orders/webhooks/square")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.statusCode).toBe(201);
    expect(res.body.path).toBe("/orders/webhooks/square");
    expect(res.body.data).toEqual({ id: "o1" });
    expect(orderServiceMock.handleSquarePaymentWebhook).toHaveBeenCalledWith(
      payload,
    );
  });

  it("GET /lms/categories", async () => {
    const res = await request(app.getHttpServer()).get("/lms/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.path).toBe("/lms/categories");
    expect(lmsServiceMock.listAccessibleCategories).toHaveBeenCalledWith("u1");
  });

  it("PATCH /enrollments/:enrollmentId/classes/:classId/progress", async () => {
    const dto = { progressPercent: 50, lastWatchedSeconds: 100 };

    const res = await request(app.getHttpServer())
      .patch("/enrollments/enr-1/classes/class-1/progress")
      .send(dto);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.path).toBe("/enrollments/enr-1/classes/class-1/progress");
    expect(enrollmentServiceMock.updateClassProgress).toHaveBeenCalledWith(
      "u1",
      "enr-1",
      "class-1",
      dto,
    );
  });

  it("should return standardized error response from global filter", async () => {
    orderServiceMock.handleSquarePaymentWebhook.mockRejectedValueOnce(
      new BadRequestException("Invalid webhook payload", "INVALID_WEBHOOK"),
    );

    const res = await request(app.getHttpServer())
      .post("/orders/webhooks/square")
      .send({ eventType: "PAYMENT_SUCCEEDED" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.path).toBe("/orders/webhooks/square");
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0].code).toBe("INVALID_WEBHOOK");
  });
});
