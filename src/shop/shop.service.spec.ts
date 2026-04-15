import { ShopService } from "./shop.service";
import {
  BadRequestException,
  NotFoundException,
} from "../common/exceptions/http.exceptions";

describe("ShopService", () => {
  const createService = () => {
    const prisma = {
      category: { findMany: jest.fn() },
      product: { findMany: jest.fn(), findUnique: jest.fn() },
      cartItem: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    const service = new ShopService(prisma);
    return { service, prisma };
  };

  it("should compute cart subtotal using discount price when available", async () => {
    const { service, prisma } = createService();

    prisma.cartItem.findMany.mockResolvedValue([
      {
        quantity: 2,
        product: { regularPrice: 100, discountPrice: 80, category: {} },
      },
      {
        quantity: 1,
        product: { regularPrice: 50, discountPrice: null, category: {} },
      },
    ]);

    const result = await service.getCart("user-1");
    expect(result.subtotal).toBe(210);
    expect(result.items).toHaveLength(2);
  });

  it("should reject addToCart when product not found", async () => {
    const { service, prisma } = createService();
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.addToCart("user-1", { productId: "p1", quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should reject addToCart when quantity exceeds stock", async () => {
    const { service, prisma } = createService();
    prisma.product.findUnique.mockResolvedValue({
      id: "p1",
      isActive: true,
      stockQuantity: 1,
    });

    await expect(
      service.addToCart("user-1", { productId: "p1", quantity: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
