import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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
    return order;
  }

  async getAdminOrders() {
    return this.prisma.order.findMany({
      include: {
        customer: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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
        orderStatus: OrderStatus.PROCESSING, // automatically transitions to production processing!
      },
    });

    for (const item of order.items) {
      await this.prisma.productionQueue.create({
        data: {
          orderItemId: item.id,
          status: 'QUEUED',
        },
      }).catch(() => {}); // catch in case already exists
    }

    return updated;
  }
}
