import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutSummaryDto } from './dto/checkout-summary.dto';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Checkout')
@Controller('checkout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('summary')
  @ApiOperation({ summary: 'Calculate pricing summary and apply discounts' })
  @ApiResponse({ status: 200, description: 'Returns order subtotal, discount, shipping, tax, and total.' })
  getSummary(@Req() req: any, @Body() dto: CheckoutSummaryDto) {
    const userId = req.user.userId;
    return this.checkoutService.getSummary(userId, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List customer shipping addresses' })
  @ApiResponse({ status: 200, description: 'Returns all saved shipping addresses.' })
  getShippingAddresses(@Req() req: any) {
    const userId = req.user.userId;
    return this.checkoutService.getShippingAddresses(userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new shipping address' })
  @ApiResponse({ status: 201, description: 'Address created successfully.' })
  createShippingAddress(@Req() req: any, @Body() dto: CreateShippingAddressDto) {
    const userId = req.user.userId;
    return this.checkoutService.createShippingAddress(userId, dto);
  }

  @Delete('addresses/:addressId')
  @ApiOperation({ summary: 'Delete a shipping address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully.' })
  deleteShippingAddress(@Req() req: any, @Param('addressId') addressId: string) {
    const userId = req.user.userId;
    return this.checkoutService.deleteShippingAddress(userId, addressId);
  }

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Verify and validate a coupon code' })
  @ApiResponse({ status: 200, description: 'Returns the coupon discount value.' })
  validateCoupon(@Body() body: { code: string; subtotal: number }) {
    return this.checkoutService.validateCoupon(body.code, body.subtotal);
  }
}
