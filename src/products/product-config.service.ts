import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CalculatePricingDto } from './dto/calculate-pricing.dto';

@Injectable()
export class ProductConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfigSchema(idOrSlug: string) {
    const isUuid = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    const product = await this.prisma.product.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        category: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found with identifier '${idOrSlug}'`);
    }

    const mappings = await this.prisma.productLayerMapping.findMany({
      where: { productId: product.id, isEditable: true },
      include: {
        svgLayer: true,
      },
    });

    const customizableParts = mappings.map((m) => ({
      id: m.svgLayer.elementId,
      label: m.svgLayer.layerName || m.svgLayer.elementId,
      defaultColor: m.defaultColorValue || m.svgLayer.defaultColor || '#FFFFFF',
    }));

    const defaultColors = mappings.reduce((acc, m) => {
      acc[m.svgLayer.elementId] = m.defaultColorValue || m.svgLayer.defaultColor || '#FFFFFF';
      return acc;
    }, {} as Record<string, string>);

    const patterns = await this.prisma.pattern.findMany();
    const fonts = await this.prisma.font.findMany();

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category.name,
      customizableParts,
      patterns: patterns.map((p) => ({
        id: p.slug,
        label: p.name,
        image: p.imageUrl,
      })),
      fonts: fonts.map((f) => ({
        id: f.fontFamily,
        name: f.name,
      })),
      supportedTabs: ['colors', 'designs', 'elements', 'players', 'text'],
      defaultColors,
      defaultPattern: 'classic',
    };
  }

  async calculatePricing(idOrSlug: string, dto: CalculatePricingDto) {
    const isUuid = idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    const product = await this.prisma.product.findFirst({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!product) {
      throw new NotFoundException(`Product not found with identifier '${idOrSlug}'`);
    }

    let baseUnitPrice = Number(product.basePrice);

    // Apply size and material upcharges via ProductVariant
    if (dto.size || dto.materialId) {
      const variantWhere: any = {
        productId: product.id,
        isActive: true,
      };

      if (dto.size) {
        variantWhere.size = { name: dto.size };
      }
      if (dto.materialId) {
        variantWhere.materialId = dto.materialId;
      }

      const variant = await this.prisma.productVariant.findFirst({
        where: variantWhere,
      });

      if (variant) {
        baseUnitPrice += Number(variant.upcharge);
      }
    }

    // Load custom quantity discounts
    const customRules = await this.prisma.quantityDiscountRule.findMany({
      where: { productId: product.id },
      orderBy: { minQuantity: 'desc' },
    });

    let discountRatio = 0;
    const matchingRule = customRules.find((rule) => dto.quantity >= rule.minQuantity);

    if (matchingRule) {
      discountRatio = Number(matchingRule.discountPercentage) / 100;
    } else {
      // Default fallbacks from requirement docs
      if (dto.quantity >= 100) discountRatio = 0.30;
      else if (dto.quantity >= 50) discountRatio = 0.20;
      else if (dto.quantity >= 25) discountRatio = 0.12;
      else if (dto.quantity >= 10) discountRatio = 0.05;
    }

    const discountedUnitPrice = baseUnitPrice * (1 - discountRatio);
    const total = discountedUnitPrice * dto.quantity;
    const savings = (baseUnitPrice - discountedUnitPrice) * dto.quantity;

    return {
      baseUnitPrice,
      discountPercent: discountRatio * 100,
      discountedUnitPrice,
      total,
      savings,
    };
  }
}
