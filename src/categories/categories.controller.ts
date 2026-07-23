import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Create a new product category' })
  @ApiResponse({ status: 201, description: 'Category successfully created.' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Returns all categories.' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Returns a category.' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Delete category by ID' })
  @ApiResponse({ status: 200, description: 'Category successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Get('/admin/cms')
  @ApiOperation({ summary: '[ADMIN] List CMS posts and pages' })
  getCms() {
    return this.categoriesService.getCms();
  }

  @Post('/admin/cms/posts')
  @ApiOperation({ summary: '[ADMIN] Create CMS post' })
  createCmsPost(@Body() body: any) {
    return this.categoriesService.createCmsPost(body);
  }

  @Post('/admin/cms/pages')
  @ApiOperation({ summary: '[ADMIN] Create CMS page' })
  createCmsPage(@Body() body: any) {
    return this.categoriesService.createCmsPage(body);
  }
}
