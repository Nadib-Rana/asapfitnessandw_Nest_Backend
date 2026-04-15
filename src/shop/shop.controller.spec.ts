import { Test, TestingModule } from "@nestjs/testing";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";

describe("ShopController", () => {
  let controller: ShopController;
  let service: jest.Mocked<ShopService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        {
          provide: ShopService,
          useValue: {
            listCategories: jest.fn(),
            listProducts: jest.fn(),
            getCart: jest.fn(),
            addToCart: jest.fn(),
            updateCartItem: jest.fn(),
            removeCartItem: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ShopController>(ShopController);
    service = module.get(ShopService);
  });

  it("should call listCategories", async () => {
    service.listCategories.mockResolvedValue([] as never);
    await controller.listCategories();
    expect(service.listCategories).toHaveBeenCalledTimes(1);
  });

  it("should call listProducts with query dto", async () => {
    const query = { categoryId: "c1", onlyActive: "true", search: "pro" };
    service.listProducts.mockResolvedValue([] as never);

    await controller.listProducts(query);
    expect(service.listProducts).toHaveBeenCalledWith(query);
  });

  it("should call cart mutation methods with user id", async () => {
    service.getCart.mockResolvedValue({ items: [], subtotal: 0 } as never);
    service.addToCart.mockResolvedValue({ id: "i1" } as never);
    service.updateCartItem.mockResolvedValue({ id: "i1" } as never);
    service.removeCartItem.mockResolvedValue({ id: "i1" } as never);

    await controller.getCart("u1");
    await controller.addToCart("u1", { productId: "p1", quantity: 1 });
    await controller.updateCartItem("u1", "i1", { quantity: 2 });
    await controller.removeCartItem("u1", "i1");

    expect(service.getCart).toHaveBeenCalledWith("u1");
    expect(service.addToCart).toHaveBeenCalledWith("u1", {
      productId: "p1",
      quantity: 1,
    });
    expect(service.updateCartItem).toHaveBeenCalledWith("u1", "i1", {
      quantity: 2,
    });
    expect(service.removeCartItem).toHaveBeenCalledWith("u1", "i1");
  });
});
