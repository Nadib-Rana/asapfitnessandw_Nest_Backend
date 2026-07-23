import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CheckoutSummaryDto } from './dto/checkout-summary.dto';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCustomerOrThrow(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return customer;
  }

  async validateCoupon(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Coupon is invalid or deactivated');
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.expiryDate) {
      throw new BadRequestException('Coupon has expired or is not yet active');
    }

    if (subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(`Minimum order value of $${coupon.minOrderValue} required for this coupon`);
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = subtotal * (Number(coupon.discountValue) / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else if (coupon.discountType === 'FIXED') {
      discount = Number(coupon.discountValue);
    }

    discount = Math.min(discount, subtotal); // discount cannot exceed subtotal

    return { coupon, discount };
  }

  async getSummary(userId: string, dto: CheckoutSummaryDto) {
    const customer = await this.getCustomerOrThrow(userId);
    const cart = await this.prisma.cart.findUnique({
      where: { sessionId: customer.id },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Shopping cart is empty');
    }

    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotalPrice), 0);

    let discount = 0;
    let couponApplied = false;
    let couponId: string | undefined = undefined;

    if (dto.couponCode) {
      const { coupon, discount: calculatedDiscount } = await this.validateCoupon(dto.couponCode, subtotal);
      discount = calculatedDiscount;
      couponApplied = true;
      couponId = coupon.id;
    }

    const shippingCost = subtotal >= 200 ? 0 : 15; // Free shipping above $200
    const tax = Math.round((subtotal - discount) * 0.08 * 100) / 100; // 8% tax
    const total = Math.round((subtotal - discount + shippingCost + tax) * 100) / 100;

    return {
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      couponApplied,
      couponId,
    };
  }

  async getShippingAddresses(userId: string) {
    const customer = await this.getCustomerOrThrow(userId);
    return this.prisma.shippingAddress.findMany({
      where: { customerId: customer.id },
    });
  }

  async createShippingAddress(userId: string, dto: CreateShippingAddressDto) {
    const customer = await this.getCustomerOrThrow(userId);

    if (dto.isDefault) {
      await this.prisma.shippingAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.shippingAddress.create({
      data: {
        customerId: customer.id,
        recipientName: dto.recipientName,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        phone: dto.phone,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async deleteShippingAddress(userId: string, addressId: string) {
    const customer = await this.getCustomerOrThrow(userId);
    const address = await this.prisma.shippingAddress.findFirst({
      where: { id: addressId, customerId: customer.id },
    });
    if (!address) {
      throw new NotFoundException(`Shipping address with ID '${addressId}' not found`);
    }

    await this.prisma.shippingAddress.delete({ where: { id: addressId } });
    return { success: true, message: 'Shipping address deleted successfully' };
  }

  async getCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async createCoupon(data: any) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Coupon code '${data.code}' already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType ? data.discountType.toUpperCase() : 'PERCENTAGE',
        discountValue: data.discountValue || 10,
        startDate: new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : new Date('2029-12-31'),
        isActive: data.isActive ?? true,
      },
    });
  }

  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true, message: 'Coupon deleted successfully' };
  }
}
