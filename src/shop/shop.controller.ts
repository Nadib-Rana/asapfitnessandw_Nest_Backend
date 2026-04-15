import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { ShopService } from "./shop.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@Controller("shop")
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get("categories")
  @ResponseMessage("Shop categories fetched successfully")
  listCategories() {
    return this.shopService.listCategories();
  }

  @Get("products")
  @ResponseMessage("Products fetched successfully")
  listProducts(@Query() query: ListProductsQueryDto) {
    return this.shopService.listProducts(query);
  }

  @Get("cart")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Cart fetched successfully")
  getCart(@GetUser("userId") userId: string) {
    return this.shopService.getCart(userId);
  }

  @Post("cart")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Cart item added successfully")
  addToCart(@GetUser("userId") userId: string, @Body() dto: AddToCartDto) {
    return this.shopService.addToCart(userId, dto);
  }

  @Patch("cart/:itemId")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Cart item updated successfully")
  updateCartItem(
    @GetUser("userId") userId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.shopService.updateCartItem(userId, itemId, dto);
  }

  @Delete("cart/:itemId")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Cart item removed successfully")
  removeCartItem(
    @GetUser("userId") userId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.shopService.removeCartItem(userId, itemId);
  }
}
