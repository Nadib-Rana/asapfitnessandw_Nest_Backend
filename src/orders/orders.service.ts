import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SvgEngineService } from '../svg-engine/svg-engine.service';
import { StorageService } from '../storage/storage.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svgEngineService: SvgEngineService,
    private readonly storageService: StorageService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { sessionId: customer.id },
      include: {
        items: {
          include: {
            product: true,
            rosters: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cannot create an order from an empty cart');
    }

    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotalPrice), 0);

    let discount = 0;
    let couponId: string | undefined = undefined;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.toUpperCase() },
      });
      if (coupon && coupon.isActive) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = subtotal * (Number(coupon.discountValue) / 100);
          if (coupon.maxDiscount) {
            discount = Math.min(discount, Number(coupon.maxDiscount));
          }
        } else {
          discount = Number(coupon.discountValue);
        }
        discount = Math.min(discount, subtotal);
        couponId = coupon.id;
      }
    }

    const shippingAmount = subtotal >= 200 ? 0 : 15;
    const taxAmount = Math.round((subtotal - discount) * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal - discount + shippingAmount + taxAmount) * 100) / 100;
    const netAmount = subtotal - discount;

    const orderNumber = `FT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        shippingAddressId: dto.shippingAddressId,
        couponId,
        totalAmount,
        discountAmount: discount,
        netAmount,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        signatureAgreed: dto.signatureUrl ? true : false,
        signatureUrl: dto.signatureUrl,
      },
    });

    for (const item of cart.items) {
      const orderItem = await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.product.basePrice,
          totalPrice: item.subtotalPrice,
          savedDesignId: item.savedDesignId,
        },
      });

      for (const rosterItem of item.rosters) {
        await this.prisma.orderItemRoster.create({
          data: {
            orderItemId: orderItem.id,
            sizeId: rosterItem.sizeId,
            playerName: rosterItem.playerName,
            playerNumber: rosterItem.playerNumber,
          },
        });
      }
    }

    // Clear cart items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    if (couponId) {
      await this.prisma.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return this.getOrderById(userId, order.id);
  }

  async getOrders(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return this.prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        shippingAddress: true,
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        coupon: true,
        items: {
          include: {
            product: {
              include: { images: true },
            },
            savedDesign: true,
            rosters: {
              include: { size: true },
            },
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    const items = await Promise.all(
      order.items.map(async (item) => {
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

    return { ...order, items };
  }

  async getAdminOrders() {
    const orders = await this.prisma.order.findMany({
      include: {
        customer: true,
        shippingAddress: true,
        items: {
          include: {
            product: {
              include: { images: true },
            },
            savedDesign: true,
            productionQueue: {
              include: {
                exportFiles: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: await Promise.all(
          order.items.map(async (item) => {
            let product = item.product;
            if (product && (product as any).images) {
              const resolvedImages = await Promise.all(
                (product as any).images.map(async (img: any) => ({
                  ...img,
                  imageUrl: await this.storageService.getPresignedObjectUrl(img.imageUrl),
                }))
              );
              product = { ...product, images: resolvedImages };
            }
            return { ...item, product };
          })
        ),
      }))
    );
  }

  async getAdminCustomers() {
    const customers = await this.prisma.customer.findMany({
      include: {
        user: true,
        orders: true,
        shippingAddresses: true,
      },
    });
    return customers.map((c: any) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.user?.email || '',
      phone: c.phone || '',
      totalOrders: c.orders ? c.orders.length : 0,
      totalSpent: c.orders ? c.orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0) : 0,
      createdAt: c.user?.createdAt || new Date(),
    }));
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }

  async generateProductionExport(orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        product: true,
        savedDesign: true,
        rosters: { include: { size: true } },
      },
    });

    if (!item) {
      throw new NotFoundException(`Order item with ID '${orderItemId}' not found`);
    }

    const svgFile = await this.prisma.svgFile.findUnique({
      where: { templateId: item.product.templateId },
      include: { views: { orderBy: { viewOrder: 'asc' } } },
    });

    if (!svgFile || !svgFile.views || svgFile.views.length === 0) {
      throw new NotFoundException(`No SVG template views found for product '${item.product.name}'`);
    }

    let prodQueue = await this.prisma.productionQueue.findUnique({
      where: { orderItemId: item.id },
    });
    if (!prodQueue) {
      prodQueue = await this.prisma.productionQueue.create({
        data: {
          orderItemId: item.id,
          status: 'QUEUED',
        },
      });
    }

    const config: any = item.savedDesign?.configurationJson || {};
    const colors = config.colors || config.defaultColors || {};
    const texts: Record<string, string> = {};
    if (config.playerText) {
      texts['text_name'] = config.playerText.name || 'PLAYER';
      texts['text_number'] = config.playerText.number || '00';
    }
    const images = config.images || {};

    const exportFiles: any[] = [];
    const defaultBucket = this.storageService.getDefaultBucket();

    for (const view of svgFile.views) {
      const exportSvgXml = this.svgEngineService.renderExportSvg(view.svgRaw, {
        colors,
        texts,
        images,
      });

      const buffer = Buffer.from(exportSvgXml, 'utf8');
      const uniqueId = Math.floor(100000 + Math.random() * 900000);
      const key = `production/${item.id}_${view.name.toLowerCase()}_${uniqueId}.svg`;

      await this.storageService.uploadObject(buffer, defaultBucket, key, 'image/svg+xml');
      const fileUrl = await this.storageService.getPresignedObjectUrl(key, defaultBucket);

      const exportRecord = await this.prisma.productionExportFile.create({
        data: {
          productionQueueId: prodQueue.id,
          fileType: 'SVG',
          fileUrl,
        },
      });
      exportFiles.push(exportRecord);
    }

    return {
      productionQueueId: prodQueue.id,
      orderItemId: item.id,
      exportFiles,
    };
  }

  async getProductionQueue() {
    return this.prisma.productionQueue.findMany({
      include: {
        orderItem: {
          include: {
            product: true,
            order: { include: { customer: true } },
            savedDesign: true,
            rosters: true,
          },
        },
        exportFiles: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async payOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PROCESSING,
      },
    });

    for (const item of order.items) {
      await this.prisma.productionQueue.upsert({
        where: { orderItemId: item.id },
        update: { status: 'QUEUED' },
        create: { orderItemId: item.id, status: 'QUEUED' },
      });
      await this.generateProductionExport(item.id).catch((err) => {
        console.warn(`Production export warning for item ${item.id}:`, err?.message);
      });
    }

    return updated;
  }
}

