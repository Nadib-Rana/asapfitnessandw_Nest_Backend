import { Test, TestingModule } from "@nestjs/testing";
import { LmsController } from "./lms.controller";
import { LmsService } from "./lms.service";

describe("LmsController", () => {
  let controller: LmsController;
  let service: jest.Mocked<LmsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LmsController],
      providers: [
        {
          provide: LmsService,
          useValue: {
            listCategoriesForAdmin: jest.fn(),
            listAccessibleCategories: jest.fn(),
            listCategoryClasses: jest.fn(),
            createCategoryForAdmin: jest.fn(),
            getCategoryByIdForAdmin: jest.fn(),
            updateCategoryForAdmin: jest.fn(),
            deleteCategoryForAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LmsController>(LmsController);
    service = module.get(LmsService);
  });

  it("should call listAccessibleCategories for customer role", async () => {
    service.listAccessibleCategories.mockResolvedValue({
      categories: [],
    } as never);

    await controller.getCategories("u1", "customer");
    expect(service.listAccessibleCategories).toHaveBeenCalledWith("u1");
    expect(service.listCategoriesForAdmin).not.toHaveBeenCalled();
  });

  it("should call listCategoriesForAdmin for vendor role", async () => {
    service.listCategoriesForAdmin.mockResolvedValue([] as never);

    await controller.getCategories("u1", "vendor");
    expect(service.listCategoriesForAdmin).toHaveBeenCalled();
    expect(service.listAccessibleCategories).not.toHaveBeenCalled();
  });

  it("should call listCategoryClasses with user id and category id", async () => {
    service.listCategoryClasses.mockResolvedValue({ classes: [] } as never);

    await controller.getCategoryClasses("u1", { categoryId: "cat-1" });
    expect(service.listCategoryClasses).toHaveBeenCalledWith("u1", "cat-1");
  });

  it("should call createCategoryForAdmin", async () => {
    service.createCategoryForAdmin.mockResolvedValue({ id: "cat-1" } as never);

    await controller.createCategory({
      title: "Strength",
      description: "Strength training",
      thumbnailKey: "lms/strength.png",
    });

    expect(service.createCategoryForAdmin).toHaveBeenCalledWith({
      title: "Strength",
      description: "Strength training",
      thumbnailKey: "lms/strength.png",
    });
  });

  it("should call getCategoryByIdForAdmin", async () => {
    service.getCategoryByIdForAdmin.mockResolvedValue({ id: "cat-1" } as never);

    await controller.getCategoryById("cat-1");
    expect(service.getCategoryByIdForAdmin).toHaveBeenCalledWith("cat-1");
  });

  it("should call updateCategoryForAdmin", async () => {
    service.updateCategoryForAdmin.mockResolvedValue({ id: "cat-1" } as never);

    await controller.updateCategory("cat-1", { title: "Updated" });
    expect(service.updateCategoryForAdmin).toHaveBeenCalledWith("cat-1", {
      title: "Updated",
    });
  });

  it("should call deleteCategoryForAdmin", async () => {
    service.deleteCategoryForAdmin.mockResolvedValue({ id: "cat-1" } as never);

    await controller.deleteCategory("cat-1");
    expect(service.deleteCategoryForAdmin).toHaveBeenCalledWith("cat-1");
  });
});
