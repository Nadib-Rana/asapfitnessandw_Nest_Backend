import { Injectable } from "@nestjs/common";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../common/exceptions/http.exceptions";
import { PrismaService } from "../common/context/prisma.service";
import { CreateClassCategoryDto } from "./dto/create-class-category.dto";
import { UpdateClassCategoryDto } from "./dto/update-class-category.dto";

@Injectable()
export class LmsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategoriesForAdmin() {
    return this.prisma.classCategory.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { classes: true },
        },
      },
    });
  }

  async getCategoryByIdForAdmin(categoryId: string) {
    const category = await this.prisma.classCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { classes: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Class category");
    }

    return category;
  }

  async createCategoryForAdmin(dto: CreateClassCategoryDto) {
    return this.prisma.classCategory.create({
      data: {
        title: dto.title,
        description: dto.description,
        thumbnailKey: dto.thumbnailKey,
      },
    });
  }

  async updateCategoryForAdmin(
    categoryId: string,
    dto: UpdateClassCategoryDto,
  ) {
    const hasAnyField = [dto.title, dto.description, dto.thumbnailKey].some(
      (value) => value !== undefined,
    );

    if (!hasAnyField) {
      throw new BadRequestException(
        "At least one field is required for update",
        "CATEGORY_UPDATE_EMPTY",
      );
    }

    await this.getCategoryByIdForAdmin(categoryId);

    return this.prisma.classCategory.update({
      where: { id: categoryId },
      data: {
        title: dto.title,
        description: dto.description,
        thumbnailKey: dto.thumbnailKey,
      },
    });
  }

  async deleteCategoryForAdmin(categoryId: string) {
    await this.getCategoryByIdForAdmin(categoryId);
    await this.prisma.classCategory.delete({ where: { id: categoryId } });
    return { id: categoryId };
  }

  private async getActiveEnrollment(userId: string) {
    const now = new Date();
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        "No active enrollment found",
        "ENROLLMENT_REQUIRED",
      );
    }

    return enrollment;
  }

  async listAccessibleCategories(userId: string) {
    const enrollment = await this.getActiveEnrollment(userId);

    return {
      enrollmentId: enrollment.id,
      expiresAt: enrollment.expiresAt,
      categories: enrollment.categories.map((item) => item.category),
    };
  }

  async listCategoryClasses(userId: string, categoryId: string) {
    const enrollment = await this.getActiveEnrollment(userId);
    const hasAccess = enrollment.categories.some(
      (item) => item.categoryId === categoryId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        "Category is not included in your enrollment",
        "CATEGORY_ACCESS_DENIED",
      );
    }

    const category = await this.prisma.classCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, title: true, description: true },
    });

    if (!category) {
      throw new NotFoundException("Class category");
    }

    const classes = await this.prisma.class.findMany({
      where: { categoryId },
      orderBy: { classOrder: "asc" },
      include: {
        progress: {
          where: { enrollmentId: enrollment.id },
          select: {
            classId: true,
            progressPercent: true,
            isCompleted: true,
            lastWatchedSeconds: true,
            reached50Milestone: true,
            reached75Milestone: true,
          },
        },
      },
    });

    const classList = classes.map((item) => {
      const progress = item.progress[0];
      return {
        id: item.id,
        classOrder: item.classOrder,
        title: item.title,
        subtitle: item.subtitle,
        durationSeconds: item.durationSeconds,
        videoKey: item.videoKey,
        thumbKey: item.thumbKey,
        progressPercent: progress?.progressPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false,
        lastWatchedSeconds: progress?.lastWatchedSeconds ?? 0,
        reached50Milestone: progress?.reached50Milestone ?? false,
        reached75Milestone: progress?.reached75Milestone ?? false,
      };
    });

    const sorted = [...classList].sort((a, b) => a.classOrder - b.classOrder);
    const unlockedIds = new Set<string>();

    sorted.forEach((item, index) => {
      if (index === 0) {
        unlockedIds.add(item.id);
        return;
      }

      const previous = sorted[index - 1];
      if (previous.isCompleted) {
        unlockedIds.add(item.id);
      }
    });

    return {
      enrollmentId: enrollment.id,
      category,
      classes: sorted.map((item) => ({
        ...item,
        locked: !unlockedIds.has(item.id),
      })),
    };
  }
}
