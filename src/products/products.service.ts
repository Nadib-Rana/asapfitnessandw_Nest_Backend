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

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Product with slug '${dto.slug}' already exists`);
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
          name: `${dto.name} Template`,
          categoryId: category.id,
          description: dto.description || '',
          basePrice: dto.basePrice,
        },
      });
      templateId = template.id;
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        basePrice: dto.basePrice,
        description: dto.description || '',
        isCustomizable: dto.isCustomizable !== false,
        isActive: dto.isActive !== false,
        categoryId: category.id,
        templateId: templateId,
        images: dto.images && dto.images.length > 0 ? {
          create: dto.images.map((url, index) => ({
            imageUrl: url,
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        images: true,
        category: true,
      },
    });

    // --- Link SVG layers from staging upload ---
    if (dto.uploadId) {
      const staging = await this.svgUploadService.findById(dto.uploadId);
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

        // Create the SvgView for this product's uploaded file
        const svgView = await this.prisma.svgView.create({
          data: {
            svgFileId: svgFile.id,
            name: 'FRONT',
            svgRaw: staging.svgRaw,
            svgUrl: staging.svgUrl,
          },
        });

        // Create SvgLayer + ProductLayerMapping for every detected layer
        for (const parsedLayer of layers) {
          const dbLayer = await this.prisma.svgLayer.create({
            data: {
              svgViewId: svgView.id,
              elementId: parsedLayer.elementId,
              layerName: parsedLayer.layerName,
              layerType: parsedLayer.layerType,
              defaultColor: parsedLayer.defaultColor ?? null,
              parentGroupId: parsedLayer.parentGroupId ?? null,
            },
          });

          await this.prisma.productLayerMapping.create({
            data: {
              productId: product.id,
              svgLayerId: dbLayer.id,
              isEditable: true,
              isRequired: parsedLayer.layerType !== 'GROUP',
              isLocked: false,
              defaultColorValue: parsedLayer.defaultColor ?? null,
            },
          });
        }

        // Mark staging record as consumed so it won't be linked twice
        await this.svgUploadService.markConsumed(dto.uploadId);
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
        images: true,
        category: true,
        template: true,
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
}
