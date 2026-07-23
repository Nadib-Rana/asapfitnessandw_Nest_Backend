import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SvgUploadService } from '../storage/svg-upload.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svgUploadService: SvgUploadService,
  ) {}

  private sanitizeString(str?: string | null, maxLen = 100): string | null {
    if (!str) return null;
    const trimmed = String(str).trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLen);
  }

  private sanitizeColor(color?: string | null): string | null {
    if (!color) return null;
    const trimmed = String(color).trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 255);
  }

  async create(dto: CreateProductDto) {
    const sanitizedSlug = this.sanitizeString(dto.slug, 150) || `product-${Date.now()}`;
    const sanitizedName = this.sanitizeString(dto.name, 150) || 'Untitled Product';

    const existing = await this.prisma.product.findUnique({
      where: { slug: sanitizedSlug },
    });
    if (existing) {
      throw new BadRequestException(`Product with slug '${sanitizedSlug}' already exists`);
    }

    const category = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: dto.category, mode: 'insensitive' } },
          { slug: { equals: dto.category.toLowerCase(), mode: 'insensitive' } },
        ],
      },
    });
    if (!category) {
      throw new NotFoundException(`Category '${dto.category}' not found`);
    }

    let templateId = dto.templateId;
    if (!templateId) {
      const template = await this.prisma.productTemplate.create({
        data: {
          name: `${sanitizedName} Template`,
          categoryId: category.id,
          description: dto.description || '',
          basePrice: dto.basePrice,
        },
      });
      templateId = template.id;
    }

    const product = await this.prisma.product.create({
      data: {
        name: sanitizedName,
        slug: sanitizedSlug,
        basePrice: dto.basePrice,
        description: dto.description || '',
        isCustomizable: dto.isCustomizable !== false,
        isActive: dto.isActive !== false,
        categoryId: category.id,
        templateId: templateId,
        images: dto.images && dto.images.length > 0 ? {
          create: dto.images.map((url, index) => ({
            imageUrl: this.sanitizeString(url, 512) || url.slice(0, 512),
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        images: true,
        category: true,
      },
    });

    // --- Link SVG layers from staging upload (single uploadId or multi-view views array) ---
    const viewsToProcess: Array<{ name: string; uploadId?: string; svgUrl?: string }> = [];
    if (dto.views && dto.views.length > 0) {
      viewsToProcess.push(...dto.views);
    } else if (dto.uploadId) {
      viewsToProcess.push({ name: 'FRONT', uploadId: dto.uploadId });
    }

    for (const viewItem of viewsToProcess) {
      if (!viewItem.uploadId) continue;
      const staging = await this.svgUploadService.findById(viewItem.uploadId);
      if (staging && !staging.isConsumed) {
        const layers = staging.layersJson as any[];

        // Ensure SvgFile exists for this template
        let svgFile = await this.prisma.svgFile.findUnique({
          where: { templateId: product.templateId },
        });
        if (!svgFile) {
          svgFile = await this.prisma.svgFile.create({
            data: {
              templateId: product.templateId,
              svgRaw: staging.svgRaw,
              width: staging.width,
              height: staging.height,
            },
          });
        }

        // Delete any existing SvgView with same name to overwrite cleanly
        const existingView = await this.prisma.svgView.findFirst({
          where: { svgFileId: svgFile.id, name: viewItem.name.toUpperCase() },
        });
        if (existingView) {
          await this.prisma.svgView.delete({ where: { id: existingView.id } });
        }

        // Create the SvgView for this view (FRONT, BACK, LEFT, RIGHT)
        const svgView = await this.prisma.svgView.create({
          data: {
            svgFileId: svgFile.id,
            name: this.sanitizeString(viewItem.name.toUpperCase(), 50) || 'FRONT',
            svgRaw: staging.svgRaw,
            svgUrl: this.sanitizeString(staging.svgUrl || viewItem.svgUrl, 512),
          },
        });

        // Create SvgLayer + ProductLayerMapping for every detected layer
        for (const parsedLayer of layers) {
          const elementId = this.sanitizeString(parsedLayer.elementId, 100) || `layer_${Date.now()}`;
          const layerName = this.sanitizeString(parsedLayer.layerName, 100) || elementId;
          const parentGroupId = this.sanitizeString(parsedLayer.parentGroupId, 100);
          const defaultColor = this.sanitizeColor(parsedLayer.defaultColor);

          const layerData: any = {
            svgViewId: svgView.id,
            elementId,
            layerName,
            layerType: parsedLayer.layerType,
            defaultColor,
            parentGroupId,
          };
          if (parsedLayer.textValue) layerData.textValue = parsedLayer.textValue;
          if (parsedLayer.fontFamily) layerData.fontFamily = this.sanitizeString(parsedLayer.fontFamily, 100);
          if (parsedLayer.fontSize) layerData.fontSize = this.sanitizeString(parsedLayer.fontSize, 50);
          if (parsedLayer.fontWeight) layerData.fontWeight = this.sanitizeString(parsedLayer.fontWeight, 50);
          if (parsedLayer.textAnchor) layerData.textAnchor = this.sanitizeString(parsedLayer.textAnchor, 50);
          if (parsedLayer.href) layerData.href = this.sanitizeString(parsedLayer.href, 512);
          if (parsedLayer.width) layerData.width = this.sanitizeString(parsedLayer.width, 50);
          if (parsedLayer.height) layerData.height = this.sanitizeString(parsedLayer.height, 50);

          let dbLayer: any;
          try {
            dbLayer = await this.prisma.svgLayer.create({ data: layerData });
          } catch (err) {
            dbLayer = await this.prisma.svgLayer.create({
              data: {
                svgViewId: svgView.id,
                elementId,
                layerName,
                layerType: parsedLayer.layerType,
                defaultColor,
                parentGroupId,
              },
            });
          }

          await this.prisma.productLayerMapping.create({
            data: {
              productId: product.id,
              svgLayerId: dbLayer.id,
              isEditable: true,
              isRequired: parsedLayer.layerType !== 'GROUP',
              isLocked: false,
              defaultColorValue: defaultColor,
            },
          });
        }

        // Mark staging record as consumed so it won't be linked twice
        await this.svgUploadService.markConsumed(viewItem.uploadId);
      }
    }

    return product;
  }

  async findAll(filters?: { category?: string; isCustomizable?: boolean }) {
    const where: any = {};
    if (filters?.category) {
      where.category = {
        slug: { equals: filters.category.toLowerCase(), mode: 'insensitive' },
      };
    }
    if (filters?.isCustomizable !== undefined) {
      where.isCustomizable = filters.isCustomizable;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        images: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(idOrSlug: string) {
    const isUuid = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    const product = await this.prisma.product.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        template: {
          include: {
            svgFile: {
              select: {
                id: true,
                width: true,
                height: true,
                version: true,
                views: {
                  select: {
                    id: true,
                    name: true,
                    svgUrl: true,
                    viewOrder: true,
                  },
                  orderBy: { viewOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found with identifier '${idOrSlug}'`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const data: any = {
      name: dto.name,
      slug: dto.slug,
      basePrice: dto.basePrice,
      description: dto.description,
      isCustomizable: dto.isCustomizable,
      isActive: dto.isActive,
      templateId: dto.templateId,
    };

    if (dto.category) {
      const category = await this.prisma.category.findFirst({
        where: {
          OR: [
            { name: { equals: dto.category, mode: 'insensitive' } },
            { slug: { equals: dto.category.toLowerCase(), mode: 'insensitive' } },
          ],
        },
      });
      if (!category) {
        throw new NotFoundException(`Category '${dto.category}' not found`);
      }
      data.categoryId = category.id;
    }

    if (dto.images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      data.images = {
        create: dto.images.map((url, index) => ({
          imageUrl: url,
          sortOrder: index,
        })),
      };
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        images: true,
        category: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true, message: 'Product successfully deleted' };
  }

  async updateLayerMapping(
    productId: string,
    mappingId: string,
    data: any,
  ) {
    try {
      return await this.prisma.productLayerMapping.update({
        where: { id: mappingId },
        data,
      });
    } catch (err) {
      const baseData: any = {};
      if (data.isEditable !== undefined) baseData.isEditable = data.isEditable;
      if (data.isRequired !== undefined) baseData.isRequired = data.isRequired;
      if (data.isLocked !== undefined) baseData.isLocked = data.isLocked;
      if (data.defaultColorValue !== undefined) baseData.defaultColorValue = data.defaultColorValue;
      return await this.prisma.productLayerMapping.update({
        where: { id: mappingId },
        data: baseData,
      });
    }
  }
}
