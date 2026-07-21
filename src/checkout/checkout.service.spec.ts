import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../database/prisma.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: any;

  const mockPrisma = {
    customer: {
      findUnique: jest.fn(),
    },
    cart: {
      findUnique: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
    },
    shippingAddress: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
