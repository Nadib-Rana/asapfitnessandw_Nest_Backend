import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../database/prisma.service';

describe('OrdersService', () => {
  let service: OrdersService;
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
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    orderItemRoster: {
      create: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
