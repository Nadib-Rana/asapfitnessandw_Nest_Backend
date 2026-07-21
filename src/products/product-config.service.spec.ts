import { Test, TestingModule } from '@nestjs/testing';
import { ProductConfigService } from './product-config.service';
import { PrismaService } from '../database/prisma.service';

describe('ProductConfigService', () => {
  let service: ProductConfigService;
  let prisma: any;

  const mockPrisma = {
    product: {
      findFirst: jest.fn(),
    },
    productLayerMapping: {
      findMany: jest.fn(),
    },
    pattern: {
      findMany: jest.fn(() => []),
    },
    font: {
      findMany: jest.fn(() => []),
    },
    material: {
      findUnique: jest.fn(),
    },
    productVariant: {
      findFirst: jest.fn(),
    },
    quantityDiscountRule: {
      findMany: jest.fn(() => []),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductConfigService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductConfigService>(ProductConfigService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
