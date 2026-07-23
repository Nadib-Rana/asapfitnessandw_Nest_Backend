import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SvgUploadService } from '../storage/svg-upload.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svgUploadService: SvgUploadService,
    private readonly storageService: StorageService,
  ) { }

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
            imageUrl: this.storageService.cleanKey(url) || this.sanitizeString(url, 512) || url.slice(0, 512),
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        images: true,
        category: true,
      },
    });

    if (dto.views && dto.views.length > 0) {
      for (const viewItem of dto.views) {
        if (viewItem.uploadId) {
          await this.linkStagingUpload(product.id, product.templateId, viewItem.uploadId, viewItem.name || 'FRONT');
        }
      }
    } else if (dto.uploadId) {
      await this.linkStagingUpload(product.id, product.templateId, dto.uploadId, 'FRONT');
    }

    return this.findOne(product.id);
  }

  private async linkStagingUpload(productId: string, templateId: string, uploadId: string, viewName = 'FRONT') {
    const staging = await this.svgUploadService.findById(uploadId);
    if (!staging) return;

    const layers = (staging.layersJson as any[]) || [];

    let svgFile = await this.prisma.svgFile.findUnique({
      where: { templateId },
    });
    if (!svgFile) {
      svgFile = await this.prisma.svgFile.create({
        data: {
          templateId,
          svgRaw: staging.svgRaw,
          width: staging.width,
          height: staging.height,
        },
      });
    }

    const cleanViewName = (viewName || 'FRONT').toUpperCase();
    const existingView = await this.prisma.svgView.findFirst({
      where: { svgFileId: svgFile.id, name: cleanViewName },
    });
    if (existingView) {
      await this.prisma.svgView.delete({ where: { id: existingView.id } });
    }

    const svgView = await this.prisma.svgView.create({
      data: {
        svgFileId: svgFile.id,
        name: cleanViewName,
        svgRaw: staging.svgRaw,
        svgUrl: this.storageService.cleanKey(staging.svgUrl),
      },
    });

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
          productId,
          svgLayerId: dbLayer.id,
          isEditable: true,
          isRequired: parsedLayer.layerType !== 'GROUP',
          isLocked: false,
          defaultColorValue: parsedLayer.defaultColor ?? null,
        },
      });
    }

    await this.svgUploadService.markConsumed(uploadId).catch(() => { });
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

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        description: true,
        isCustomizable: true,
        isActive: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      products.map(async (product) => ({
        ...product,
        images: await Promise.all(
          product.images.map(async (img) => ({
            ...img,
            imageUrl: await this.storageService.getPresignedObjectUrl(img.imageUrl),
          }))
        ),
      }))
    );
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

    const resolvedImages = await Promise.all(
      product.images.map(async (img) => ({
        ...img,
        imageUrl: await this.storageService.getPresignedObjectUrl(img.imageUrl),
      }))
    );

    let resolvedTemplate = product.template;
    if (resolvedTemplate?.svgFile?.views) {
      const resolvedViews = await Promise.all(
        resolvedTemplate.svgFile.views.map(async (view) => ({
          ...view,
          svgUrl: view.svgUrl
            ? await this.storageService.getPresignedObjectUrl(view.svgUrl)
            : view.svgUrl,
        }))
      );
      resolvedTemplate = {
        ...resolvedTemplate,
        svgFile: {
          ...resolvedTemplate.svgFile,
          views: resolvedViews,
        },
      };
    }

    return {
      ...product,
      images: resolvedImages,
      template: resolvedTemplate,
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);
    const data: any = {
      name: dto.name,
      slug: dto.slug,
      basePrice: dto.basePrice,
      description: dto.description,
      isCustomizable: dto.isCustomizable,
      isActive: dto.isActive,
      templateId: dto.templateId,
    };
    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: { images: true, category: true },
    });

    if (dto.views && dto.views.length > 0) {
      for (const viewItem of dto.views) {
        if (viewItem.uploadId) {
          await this.linkStagingUpload(updated.id, updated.templateId, viewItem.uploadId, viewItem.name || 'FRONT');
        }
      }
    } else if (dto.uploadId) {
      await this.linkStagingUpload(updated.id, updated.templateId, dto.uploadId, 'FRONT');
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true, message: 'Product deleted successfully' };
  }

  async updateLayerMapping(productId: string, mappingId: string, dto: any) {
    const mapping = await this.prisma.productLayerMapping.findFirst({
      where: {
        id: mappingId,
        productId,
      },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Layer mapping '${mappingId}' not found for product '${productId}'`,
      );
    }

    const data: any = {};
    if (dto.isEditable !== undefined) data.isEditable = dto.isEditable;
    if (dto.isRequired !== undefined) data.isRequired = dto.isRequired;
    if (dto.isLocked !== undefined) data.isLocked = dto.isLocked;
    if (dto.defaultColorValue !== undefined) data.defaultColorValue = dto.defaultColorValue;
    if (dto.placeholder !== undefined) data.placeholder = dto.placeholder;
    if (dto.maxChars !== undefined) data.maxChars = dto.maxChars;
    if (dto.minChars !== undefined) data.minChars = dto.minChars;
    if (dto.allowedFontsJson !== undefined) data.allowedFontsJson = dto.allowedFontsJson;
    if (dto.allowedFormatsJson !== undefined) data.allowedFormatsJson = dto.allowedFormatsJson;
    if (dto.maxSizeBytes !== undefined) data.maxSizeBytes = dto.maxSizeBytes;

    return this.prisma.productLayerMapping.update({
      where: { id: mappingId },
      data,
      include: {
        svgLayer: true,
      },
    });
  }
}

