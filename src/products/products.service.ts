import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
