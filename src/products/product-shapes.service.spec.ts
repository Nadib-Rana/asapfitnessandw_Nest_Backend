import { Test, TestingModule } from '@nestjs/testing';
import { ProductShapesService } from './product-shapes.service';
import { PrismaService } from '../database/prisma.service';
import { SvgEngineService } from '../svg-engine/svg-engine.service';

describe('ProductShapesService', () => {
  let service: ProductShapesService;
  let prisma: any;
  let svgEngine: any;

  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
    },
    svgFile: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    svgView: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    svgLayer: {
      create: jest.fn(),
    },
    productLayerMapping: {
      create: jest.fn(),
    },
  };

  const mockSvgEngine = {
    parseSvg: jest.fn(() => ({
      width: 800,
      height: 800,
      layers: [
        {
          elementId: 'collar',
          layerName: 'Collar',
          layerType: 'FILL',
          defaultColor: '#ffffff',
          parentGroupId: undefined,
        },
      ],
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductShapesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SvgEngineService, useValue: mockSvgEngine },
      ],
    }).compile();

    service = module.get<ProductShapesService>(ProductShapesService);
    prisma = module.get<PrismaService>(PrismaService);
    svgEngine = module.get<SvgEngineService>(SvgEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
