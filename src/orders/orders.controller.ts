import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Submit a new order from active shopping cart' })
  @ApiResponse({ status: 201, description: 'Order successfully created.' })
  createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = req.user.userId;
    return this.ordersService.createOrder(userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List customer orders' })
  @ApiResponse({ status: 200, description: 'Returns order list.' })
  getOrders(@Req() req: any) {
    const userId = req.user.userId;
    return this.ordersService.getOrders(userId);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order details' })
  @ApiResponse({ status: 200, description: 'Returns order detail.' })
  getOrderById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.ordersService.getOrderById(userId, id);
  }

  @Post('orders/:id/pay')
  @ApiOperation({ summary: 'Simulate successful Stripe payment payment gateway transaction' })
  @ApiResponse({ status: 200, description: 'Order successfully paid.' })
  payOrder(@Param('id') id: string) {
    return this.ordersService.payOrder(id);
  }

  @Get('admin/orders')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] List all orders' })
  @ApiResponse({ status: 200, description: 'Returns all system orders.' })
  getAdminOrders() {
    return this.ordersService.getAdminOrders();
  }

  @Get('admin/customers')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] List all customers' })
  @ApiResponse({ status: 200, description: 'Returns customer list with purchase statistics.' })
  getAdminCustomers() {
    return this.ordersService.getAdminCustomers();
  }

  @Put('admin/orders/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Update order fulfillment status' })
  @ApiResponse({ status: 200, description: 'Order status successfully updated.' })
  updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateOrderStatus(id, body.status as OrderStatus);
  }
}
