import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductShapesService } from './product-shapes.service';
import { ProductConfigService } from './product-config.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddShapeDto } from './dto/add-shape.dto';
import { CalculatePricingDto } from './dto/calculate-pricing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Products')
@Controller()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productShapesService: ProductShapesService,
    private readonly productConfigService: ProductConfigService,
  ) {}

  // --- Customer / Public Routes ---
  @Get('products')
  @ApiOperation({ summary: 'Get catalog products' })
  @ApiResponse({ status: 200, description: 'Returns catalog products.' })
  async findAll(
    @Query('category') category?: string,
    @Query('isCustomizable') isCustomizable?: string,
  ) {
    const filters: any = {};
    if (category) filters.category = category;
    if (isCustomizable !== undefined) {
      filters.isCustomizable = isCustomizable === 'true';
    }
    return this.productsService.findAll(filters);
  }

  @Get('products/:idOrSlug')
  @ApiOperation({ summary: 'Get product by ID or Slug' })
  @ApiResponse({ status: 200, description: 'Returns a single product.' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOne(idOrSlug);
  }

  @Get('products/:idOrSlug/config-schema')
  @ApiOperation({ summary: 'Get customization configuration schema for a product' })
  @ApiResponse({ status: 200, description: 'Returns customizable elements and configurations.' })
  async getConfigSchema(@Param('idOrSlug') idOrSlug: string) {
    return this.productConfigService.getConfigSchema(idOrSlug);
  }

  @Post('products/:idOrSlug/pricing')
  @ApiOperation({ summary: 'Calculate dynamic pricing based on configuration options' })
  @ApiResponse({ status: 200, description: 'Returns dynamic unit price and total price calculations.' })
  async calculatePricing(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CalculatePricingDto,
  ) {
    return this.productConfigService.calculatePricing(idOrSlug, dto);
  }

  // --- Admin Administrative Routes ---
  @Post('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Create a new product' })
  @ApiResponse({ status: 201, description: 'Product successfully created.' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] List all products' })
  @ApiResponse({ status: 200, description: 'Returns admin products list.' })
  async findAdminAll() {
    const products = await this.productsService.findAll();
    return { products }; // Formatted to match RTK Query expectations in foremosttrading-admin
  }

  @Put('admin/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Update a product' })
  @ApiResponse({ status: 200, description: 'Product successfully updated.' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete('admin/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Delete a product' })
  @ApiResponse({ status: 200, description: 'Product successfully deleted.' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Post('admin/products/:productId/shapes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Add template shape/view and auto parse SVG layers' })
  @ApiResponse({ status: 201, description: 'SVG parsed and layers successfully mapped.' })
  async addShape(
    @Param('productId') productId: string,
    @Body() dto: AddShapeDto,
  ) {
    return this.productShapesService.addShape(productId, dto);
  }

  @Get('admin/products/:productId/shapes')
  @ApiOperation({ summary: 'Get view template shapes for a product' })
  @ApiResponse({ status: 200, description: 'Returns shapes/views mapped to the product.' })
  async getShapes(@Param('productId') productId: string) {
    return this.productShapesService.getShapes(productId);
  }

  @Put('admin/products/:productId/mappings/:mappingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Update layer mapping settings (text/image/color rules)' })
  @ApiResponse({ status: 200, description: 'Layer mapping configuration updated.' })
  async updateMapping(
    @Param('productId') productId: string,
    @Param('mappingId') mappingId: string,
    @Body() body: any,
  ) {
    return this.productsService.updateLayerMapping(productId, mappingId, body);
  }
}
