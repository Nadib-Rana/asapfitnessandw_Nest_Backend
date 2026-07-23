import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Category slug '${dto.slug}' already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        children: true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({
      where: { id },
    });
    return { success: true, message: 'Category successfully deleted' };
  }

  private cmsPosts: any[] = [
    { id: 'post-1', title: 'Top Custom Jersey Trends 2026', author: 'Design Team', status: 'Published', date: '2026-07-01' },
    { id: 'post-2', title: 'Choosing the Right Sublimation Fabric', author: 'Production Lab', status: 'Published', date: '2026-07-15' },
  ];

  private cmsPages: any[] = [
    { id: 'page-1', title: 'Size & Fit Guide', slug: 'size-guide', status: 'Active' },
    { id: 'page-2', title: 'Bulk Order Quotation', slug: 'bulk-quote', status: 'Active' },
  ];

  async getCms() {
    return {
      posts: this.cmsPosts,
      pages: this.cmsPages,
    };
  }

  async createCmsPost(data: { title: string; author?: string; status?: string }) {
    const post = {
      id: `post-${Date.now()}`,
      title: data.title,
      author: data.author || 'Admin',
      status: data.status || 'Published',
      date: new Date().toISOString().split('T')[0],
    };
    this.cmsPosts.push(post);
    return post;
  }

  async createCmsPage(data: { title: string; slug: string; status?: string }) {
    const page = {
      id: `page-${Date.now()}`,
      title: data.title,
      slug: data.slug,
      status: data.status || 'Active',
    };
    this.cmsPages.push(page);
    return page;
  }
}
