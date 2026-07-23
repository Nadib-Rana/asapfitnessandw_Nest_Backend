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
        template: true,
        images: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found with identifier '${idOrSlug}'`);
    }

    const mappings = await this.prisma.productLayerMapping.findMany({
      where: { productId: product.id },
      include: {
        svgLayer: {
          include: { svgView: true },
        },
      },
    });

    const customizableParts = mappings
      .filter((m) => m.isEditable)
      .map((m) => ({
        id: m.svgLayer.elementId,
        label: m.svgLayer.layerName || m.svgLayer.elementId,
        defaultColor: m.defaultColorValue || m.svgLayer.defaultColor || '#FFFFFF',
        isEditable: m.isEditable,
        isRequired: m.isRequired,
        isLocked: m.isLocked,
      }));

    const defaultColors = mappings.reduce((acc, m) => {
      if (m.isEditable) {
        acc[m.svgLayer.elementId] = m.defaultColorValue || m.svgLayer.defaultColor || '#FFFFFF';
      }
      return acc;
    }, {} as Record<string, string>);

    let views: any[] = [];
    if (product.templateId) {
      const svgFile = await this.prisma.svgFile.findUnique({
        where: { templateId: product.templateId },
        include: {
          views: {
            include: {
              layers: {
                include: {
                  mappings: {
                    where: { productId: product.id },
                  },
                },
              },
            },
            orderBy: { viewOrder: 'asc' },
          },
        },
      });

      if (svgFile && svgFile.views) {
        views = svgFile.views.map((v) => ({
          id: v.id,
          name: v.name,
          svgUrl: v.svgUrl,
          svgRaw: v.svgRaw,
          viewOrder: v.viewOrder,
          layers: v.layers.map((l) => {
            const m = l.mappings[0];
            return {
              id: l.id,
              elementId: l.elementId,
              layerName: l.layerName,
              layerType: l.layerType,
              defaultColor: l.defaultColor,
              parentGroupId: l.parentGroupId,
              isEditable: m ? m.isEditable : true,
              isRequired: m ? m.isRequired : true,
              isLocked: m ? m.isLocked : false,
              defaultColorValue: m ? m.defaultColorValue : l.defaultColor,
            };
          }),
        }));
      }
    }

    let svgUrl: string | null = null;
    const frontView = views.find((v) => v.name.toUpperCase() === 'FRONT') || views[0];
    if (frontView) {
      svgUrl = frontView.svgUrl;
    } else if (mappings.length > 0 && mappings[0].svgLayer.svgView) {
      svgUrl = mappings[0].svgLayer.svgView.svgUrl;
    }

    const patterns = await this.prisma.pattern.findMany();
    const fonts = await this.prisma.font.findMany();

    const texts = mappings
      .filter(
        (m) =>
          m.svgLayer.layerType === 'TEXT' ||
          m.svgLayer.elementId.toLowerCase().includes('text') ||
          m.svgLayer.elementId.toLowerCase().includes('name') ||
          m.svgLayer.elementId.toLowerCase().includes('number') ||
          m.svgLayer.elementId.toLowerCase().includes('player'),
      )
      .map((m: any) => ({
        id: m.svgLayer.elementId,
        layerName: m.svgLayer.layerName || m.svgLayer.elementId,
        textValue: (m.svgLayer as any).textValue || m.placeholder || 'ENTER TEXT',
        fontFamily: (m.svgLayer as any).fontFamily || 'Montserrat',
        fontSize: (m.svgLayer as any).fontSize || '24px',
        fontWeight: (m.svgLayer as any).fontWeight || 'bold',
        textAnchor: (m.svgLayer as any).textAnchor || 'middle',
        placeholder: m.placeholder || 'ENTER TEXT',
        maxChars: m.maxChars || 20,
        minChars: m.minChars || 1,
        isEditable: m.isEditable ?? true,
        isLocked: m.isLocked ?? false,
        isRequired: m.isRequired ?? false,
        allowedFonts: m.allowedFontsJson || [],
      }));

    const imagePlaceholders = mappings
      .filter((m) => m.svgLayer.layerType === 'IMAGE')
      .map((m: any) => ({
        id: m.svgLayer.elementId,
        layerName: m.svgLayer.layerName || m.svgLayer.elementId,
        href: (m.svgLayer as any).href || '',
        width: (m.svgLayer as any).width || '100',
        height: (m.svgLayer as any).height || '100',
        isEditable: m.isEditable,
        isLocked: m.isLocked,
        isRequired: m.isRequired,
        allowedFormats: m.allowedFormatsJson || ['PNG', 'SVG', 'JPG', 'WEBP'],
        maxSizeBytes: m.maxSizeBytes || 5242880,
      }));

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description || '',
      category: product.category ? product.category.name : '',
      basePrice: Number(product.basePrice),
      images: product.images ? product.images.map((img) => img.imageUrl) : [],
      isCustomizable: product.isCustomizable,
      isActive: product.isActive,
      svgUrl,
      views,
      customizableParts,
      texts,
      imagePlaceholders,
      layerMappings: mappings.map((m) => ({
        id: m.id,
        productId: m.productId,
        svgLayerId: m.svgLayerId,
        elementId: m.svgLayer.elementId,
        layerName: m.svgLayer.layerName,
        layerType: m.svgLayer.layerType,
        isEditable: m.isEditable,
        isRequired: m.isRequired,
        isLocked: m.isLocked,
        defaultColorValue: m.defaultColorValue || m.svgLayer.defaultColor,
      })),
      patterns: patterns.map((p) => ({
        id: p.slug,
        label: p.name,
        image: p.imageUrl,
      })),
      fonts: fonts.map((f) => ({
        id: f.fontFamily,
        name: f.name,
      })),
      layerGroups: (await this.prisma.layerGroup.findMany({
        where: { productId: product.id },
        include: {
          groupLayers: {
            include: { svgLayer: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      })).map((g) => ({
        id: g.id,
        name: g.name,
        isLocked: g.isLocked,
        isVisible: g.isVisible,
        displayOrder: g.displayOrder,
        layers: g.groupLayers.map((gl) => ({
          id: gl.svgLayer.elementId,
          svgLayerId: gl.svgLayerId,
          displayLabel: gl.displayLabel || gl.svgLayer.layerName || gl.svgLayer.elementId,
          displayOrder: gl.displayOrder,
        })),
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
