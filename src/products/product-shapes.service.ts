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

  private sanitizeHexColor(color?: string | null): string | null {
    if (!color) return null;
    const trimmed = color.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.slice(0, 7); // Max 7 chars for #RRGGBB
    }
    return null;
  }

  private sanitizeString(str?: string | null, maxLen = 100): string {
    if (!str) return '';
    return str.trim().slice(0, maxLen);
  }

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

    const executeInTransaction = async (tx: any) => {
      // Ensure SvgFile exists
      let svgFile = await tx.svgFile.findUnique({
        where: { templateId: product.templateId },
      });
      if (!svgFile) {
        svgFile = await tx.svgFile.create({
          data: {
            templateId: product.templateId,
            svgRaw: svgContent,
            width,
            height,
          },
        });
      }

      // Delete existing SvgView with same name to cascade clean layers/mappings
      const existingView = await tx.svgView.findFirst({
        where: { svgFileId: svgFile.id, name: dto.name },
      });
      if (existingView) {
        await tx.svgView.delete({ where: { id: existingView.id } });
      }

      // Create new SvgView
      const svgView = await tx.svgView.create({
        data: {
          svgFileId: svgFile.id,
          name: dto.name,
          svgRaw: svgContent,
          svgUrl: dto.svgUrl,
        },
      });

      // Save SVG Layers & mappings with deduplication and sanitization
      const usedElementIds = new Set<string>();

      for (let i = 0; i < layers.length; i++) {
        const parsedLayer = layers[i];

        let baseElementId = this.sanitizeString(parsedLayer.elementId, 100) || `layer_${i + 1}`;
        let uniqueElementId = baseElementId;
        let dupCounter = 1;
        while (usedElementIds.has(uniqueElementId)) {
          uniqueElementId = `${baseElementId.slice(0, 90)}_${dupCounter++}`;
        }
        usedElementIds.add(uniqueElementId);

        const layerName = this.sanitizeString(parsedLayer.layerName, 100) || uniqueElementId;
        const parentGroupId = parsedLayer.parentGroupId ? this.sanitizeString(parsedLayer.parentGroupId, 100) : null;
        const defaultColor = this.sanitizeHexColor(parsedLayer.defaultColor);

        // Flexible isEditable matching (by exact ID, layerName, or clean normalized string)
        const isEditable = (dto.layers || []).some((userLayer) => {
          if (!userLayer) return false;
          const u = userLayer.toLowerCase().trim();
          const el = uniqueElementId.toLowerCase();
          const ln = layerName.toLowerCase();
          const origEl = (parsedLayer.elementId || '').toLowerCase();
          return u === el || u === ln || u === origEl || el.includes(u) || ln.includes(u);
        });

        const dbLayer = await tx.svgLayer.create({
          data: {
            svgViewId: svgView.id,
            elementId: uniqueElementId,
            layerName,
            layerType: parsedLayer.layerType,
            defaultColor,
            parentGroupId,
            textValue: parsedLayer.textValue ? this.sanitizeString(parsedLayer.textValue, 500) : null,
            fontFamily: parsedLayer.fontFamily ? this.sanitizeString(parsedLayer.fontFamily, 100) : null,
            fontSize: parsedLayer.fontSize ? this.sanitizeString(parsedLayer.fontSize, 50) : null,
            fontWeight: parsedLayer.fontWeight ? this.sanitizeString(parsedLayer.fontWeight, 50) : null,
            textAnchor: parsedLayer.textAnchor ? this.sanitizeString(parsedLayer.textAnchor, 50) : null,
            href: parsedLayer.href ? this.sanitizeString(parsedLayer.href, 500) : null,
            width: parsedLayer.width ? this.sanitizeString(parsedLayer.width, 50) : null,
            height: parsedLayer.height ? this.sanitizeString(parsedLayer.height, 50) : null,
          },
        });

        await tx.productLayerMapping.create({
          data: {
            productId: product.id,
            svgLayerId: dbLayer.id,
            isEditable,
            isRequired: isEditable,
            isLocked: !isEditable,
            defaultColorValue: defaultColor,
          },
        });
      }

      return {
        id: svgView.id,
        name: svgView.name,
        svgUrl: svgView.svgUrl,
        layers: dto.layers || [],
      };
    };

    if (typeof this.prisma.$transaction === 'function') {
      return await this.prisma.$transaction(executeInTransaction);
    } else {
      return await executeInTransaction(this.prisma);
    }
  }

  async getShapes(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, templateId: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const views = await this.prisma.svgView.findMany({
      where: {
        svgFile: {
          templateId: product.templateId,
        },
      },
      select: {
        id: true,
        name: true,
        svgUrl: true,
        viewOrder: true,
        layers: {
          select: {
            elementId: true,
            mappings: {
              where: { productId },
              select: { isEditable: true },
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
