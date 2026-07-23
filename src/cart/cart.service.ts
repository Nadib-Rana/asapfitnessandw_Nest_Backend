import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private async getCustomerOrThrow(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return customer;
  }

  private async findOrCreateCart(customerId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { sessionId: customerId },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          customerId,
          sessionId: customerId, // Using customerId as the unique sessionId for logged-in sessions
        },
      });
    }
    return cart;
  }

  async getCart(userId: string) {
    const customer = await this.getCustomerOrThrow(userId);
    const cart = await this.findOrCreateCart(customer.id);

    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
            savedDesign: true,
            rosters: {
              include: {
                size: true,
              },
            },
          },
        },
      },
    });

    if (!fullCart) return null;

    const items = await Promise.all(
      fullCart.items.map(async (item) => {
        let product = item.product;
        if (product && product.images) {
          const resolvedImages = await Promise.all(
            product.images.map(async (img) => ({
              ...img,
              imageUrl: await this.storageService.getPresignedObjectUrl(img.imageUrl),
            }))
          );
          product = { ...product, images: resolvedImages };
        }
        return { ...item, product };
      })
    );

    return { ...fullCart, items };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const customer = await this.getCustomerOrThrow(userId);
    const cart = await this.findOrCreateCart(customer.id);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${dto.productId}' not found`);
    }

    // Create a SavedDesign for this cart item configuration
    const design = await this.prisma.savedDesign.create({
      data: {
        customerId: customer.id,
        productId: dto.productId,
        name: `Cart Config - ${product.name}`,
        configurationJson: dto.configurationJson,
      },
    });

    // Calculate subtotal price
    const basePrice = Number(product.basePrice);
    const subtotalPrice = basePrice * dto.quantity;

    // Create cart item
    const cartItem = await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        savedDesignId: design.id,
        quantity: dto.quantity,
        subtotalPrice,
      },
    });

    // Create roster items if provided
    if (dto.roster && dto.roster.length > 0) {
      for (const rosterItem of dto.roster) {
        await this.prisma.cartItemRoster.create({
          data: {
            cartItemId: cartItem.id,
            sizeId: rosterItem.sizeId,
            playerName: rosterItem.name,
            playerNumber: rosterItem.number,
          },
        });
      }
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const customer = await this.getCustomerOrThrow(userId);
    const cart = await this.findOrCreateCart(customer.id);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });
    if (!item) {
      throw new NotFoundException(`Cart item with ID '${itemId}' not found in user's cart`);
    }

    const subtotalPrice = Number(item.product.basePrice) * dto.quantity;

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        subtotalPrice,
      },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const customer = await this.getCustomerOrThrow(userId);
    const cart = await this.findOrCreateCart(customer.id);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException(`Cart item with ID '${itemId}' not found in user's cart`);
    }

    // Delete cart item (cascade will delete rosters, but we must delete the associated SavedDesign as well)
    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    if (item.savedDesignId) {
      await this.prisma.savedDesign.delete({
        where: { id: item.savedDesignId },
      }).catch(() => {}); // ignore if already deleted
    }

    return { success: true, message: 'Item removed from cart successfully' };
  }
}
