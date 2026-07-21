import { Test, TestingModule } from '@nestjs/testing';
import { ProductionService } from './production.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('ProductionService', () => {
  let service: ProductionService;
  let prisma: any;
  let storage: any;

  const mockPrisma = {
    productionQueue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productionExportFile: {
      create: jest.fn(),
    },
  };

  const mockStorage = {
    getDefaultBucket: jest.fn(() => 'media'),
    uploadObject: jest.fn(),
    getObjectUrl: jest.fn(() => 'http://localhost/file.svg'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
