import { Injectable } from "@nestjs/common";
import {
  ForbiddenException,
  NotFoundException,
} from "../common/exceptions/http.exceptions";
import { PrismaService } from "../common/context/prisma.service";

@Injectable()
export class LmsService {
  constructor(private readonly prisma: PrismaService) {}

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
