import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SvgEngineService } from '../svg-engine/svg-engine.service';
import { AddShapeDto } from './dto/add-shape.dto';

@Injectable()
export class ProductShapesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svgEngineService: SvgEngineService,
  ) {}

  async addShape(productId: string, dto: AddShapeDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    let svgContent = '';
    try {
      const response = await fetch(dto.svgUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      svgContent = await response.text();
    } catch (err: any) {
      throw new BadRequestException(`Failed to download SVG template from '${dto.svgUrl}': ${err.message}`);
    }

    const { width, height, layers } = this.svgEngineService.parseSvg(svgContent);

    // Ensure SvgFile exists
    let svgFile = await this.prisma.svgFile.findUnique({
      where: { templateId: product.templateId },
    });
    if (!svgFile) {
      svgFile = await this.prisma.svgFile.create({
        data: {
          templateId: product.templateId,
          svgRaw: svgContent,
          width,
          height,
        },
      });
    }

    // Delete existing SvgView with same name to cascade clean layers/mappings
    const existingView = await this.prisma.svgView.findFirst({
      where: { svgFileId: svgFile.id, name: dto.name },
    });
    if (existingView) {
      await this.prisma.svgView.delete({ where: { id: existingView.id } });
    }

    // Create new SvgView
    const svgView = await this.prisma.svgView.create({
      data: {
        svgFileId: svgFile.id,
        name: dto.name,
        svgRaw: svgContent,
        svgUrl: dto.svgUrl,
      },
    });

    // Save SVG Layers & mappings
    for (const parsedLayer of layers) {
      const isEditable = dto.layers?.includes(parsedLayer.elementId) ?? false;

      const dbLayer = await this.prisma.svgLayer.create({
        data: {
          svgViewId: svgView.id,
          elementId: parsedLayer.elementId,
          layerName: parsedLayer.layerName,
          layerType: parsedLayer.layerType,
          defaultColor: parsedLayer.defaultColor,
          parentGroupId: parsedLayer.parentGroupId,
        },
      });

      await this.prisma.productLayerMapping.create({
        data: {
          productId: product.id,
          svgLayerId: dbLayer.id,
          isEditable,
          isRequired: isEditable,
          isLocked: !isEditable,
          defaultColorValue: parsedLayer.defaultColor,
        },
      });
    }

    return {
      id: svgView.id,
      name: svgView.name,
      svgUrl: svgView.svgUrl,
      layers: dto.layers || [],
    };
  }

  async getShapes(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

        const views = await this.prisma.svgView.findMany({
      where: {
        svgFile: {
          template: {
            products: {
              some: { id: productId },
            },
          },
        },
      },
      include: {
        layers: {
          include: {
            mappings: {
              where: { productId },
            },
          },
        },
      },
      orderBy: { viewOrder: 'asc' },
    });

    const shapes = views.map((view) => {
      const editableLayerIds = view.layers
        .filter((layer) => layer.mappings.some((m) => m.isEditable))
        .map((layer) => layer.elementId);

      return {
        id: view.id,
        name: view.name,
        svgUrl: view.svgUrl,
        layers: editableLayerIds,
      };
    });

    return { shapes };
  }
}
