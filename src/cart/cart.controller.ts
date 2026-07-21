import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve active shopping cart' })
  @ApiResponse({ status: 200, description: 'Returns the user\'s shopping cart and its items.' })
  getCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a new product configuration item to cart' })
  @ApiResponse({ status: 201, description: 'Item added successfully, returns active cart.' })
  addItem(@Req() req: any, @Body() dto: AddCartItemDto) {
    const userId = req.user.userId;
    return this.cartService.addItem(userId, dto);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Item quantity updated successfully, returns active cart.' })
  updateItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user.userId;
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from shopping cart' })
  @ApiResponse({ status: 200, description: 'Item removed successfully.' })
  removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    const userId = req.user.userId;
    return this.cartService.removeItem(userId, itemId);
  }
}
