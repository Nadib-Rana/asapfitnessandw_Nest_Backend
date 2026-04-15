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
            listAccessibleCategories: jest.fn(),
            listCategoryClasses: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LmsController>(LmsController);
    service = module.get(LmsService);
  });

  it("should call listAccessibleCategories with user id", async () => {
    service.listAccessibleCategories.mockResolvedValue({
      categories: [],
    } as never);

    await controller.getCategories("u1");
    expect(service.listAccessibleCategories).toHaveBeenCalledWith("u1");
  });

  it("should call listCategoryClasses with user id and category id", async () => {
    service.listCategoryClasses.mockResolvedValue({ classes: [] } as never);

    await controller.getCategoryClasses("u1", { categoryId: "cat-1" });
    expect(service.listCategoryClasses).toHaveBeenCalledWith("u1", "cat-1");
  });
});
