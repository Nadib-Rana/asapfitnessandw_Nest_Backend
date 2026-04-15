import { Injectable } from "@nestjs/common";
import {
  BadRequestException,
  NotFoundException,
} from "../common/exceptions/http.exceptions";
import { PrismaService } from "../common/context/prisma.service";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  async listProducts(query: ListProductsQueryDto) {
    return this.prisma.product.findMany({
      where: {
        categoryId: query.categoryId,
        isActive:
          query.onlyActive === undefined
            ? true
            : query.onlyActive.toLowerCase() === "true",
        title: query.search
          ? { contains: query.search, mode: "insensitive" }
          : undefined,
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const subtotal = items.reduce((sum, item) => {
      const unitPrice = item.product.discountPrice ?? item.product.regularPrice;
      return sum + Number(unitPrice) * item.quantity;
    }, 0);

    return {
      items,
      subtotal,
    };
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, isActive: true, stockQuantity: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException("Product");
    }

    if (dto.quantity > product.stockQuantity) {
      throw new BadRequestException(
        "Requested quantity exceeds available stock",
        "INSUFFICIENT_STOCK",
      );
    }

    const item = await this.prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
      update: {
        quantity: dto.quantity,
        updatedAt: new Date(),
      },
      create: {
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
      },
    });

    return item;
  }

  async updateCartItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: {
        product: {
          select: { stockQuantity: true, isActive: true },
        },
      },
    });

    if (!cartItem || !cartItem.product.isActive) {
      throw new NotFoundException("Cart item");
    }

    if (dto.quantity > cartItem.product.stockQuantity) {
      throw new BadRequestException(
        "Requested quantity exceeds available stock",
        "INSUFFICIENT_STOCK",
      );
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        updatedAt: new Date(),
      },
    });
  }

  async removeCartItem(userId: string, itemId: string) {
    const existing = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Cart item");
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { id: itemId };
  }
}
