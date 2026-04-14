import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { StorageService } from "../../storage/storage.service";

/**
 * ImageTransformInterceptor
 *
 * এই interceptor সমস্ত API responses-এ image keys কে presigned URLs-এ রূপান্তরিত করে।
 *
 * Features:
 * - Profile images ট্রান্সফর্ম করে (users/ prefix)
 * - Business logos ট্রান্সফর্ম করে
 * - Business images arrays ট্রান্সফর্ম করে
 * - Nested objects recursively handle করে
 * - Category images support করে
 *
 * Response Format:
 * {
 *   "profileImage": "http://minio:9010/devscout-profiles/users/...",      // Direct URL
 *   "profileImageKey": "users/user-123/profile-1711938000000.jpg"         // Raw key backup
 * }
 */
@Injectable()
export class ImageTransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ImageTransformInterceptor.name);

  constructor(private storageService: StorageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        try {
          if (data && typeof data === "object") {
            return this.transformImageKeys(data);
          }
          return data;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Error transforming image keys: ${errorMessage}`);
          // Return original data if transformation fails
          return data;
        }
      }),
    );
  }

  /**
   * Recursively transform image keys in objects
   */
  private transformImageKeys(obj: unknown): unknown {
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformImageKeys(item)) as unknown;
    }

    // Handle primitives
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // Handle objects
    const source = obj as Record<string, unknown>;
    const transformed: Record<string, unknown> = { ...source };

    // Transform User Model
    const profileImage = source.profileImage;
    if (
      typeof profileImage === "string" &&
      this.isValidImageKey(profileImage, "users")
    ) {
      transformed.profileImage = this.storageService.getObjectUrl(
        profileImage,
        "profiles",
      );
      transformed.profileImageKey = profileImage; // ব্যাকআপ key
    }

    // Transform Business Model
    const logoKey = source.logoKey;
    if (
      typeof logoKey === "string" &&
      this.isValidImageKey(logoKey, "businesses")
    ) {
      transformed.logo = this.storageService.getObjectUrl(
        logoKey,
        "businesses",
      );
      transformed.logoKey = logoKey; // ব্যাকআপ key
    }

    // Transform Category Model
    const imageKey = source.imageKey;
    if (
      typeof imageKey === "string" &&
      this.isValidImageKey(imageKey, "categories")
    ) {
      transformed.image = this.storageService.getObjectUrl(
        imageKey,
        "categories",
      );
      transformed.imageKey = imageKey; // ব্যাকআপ key
    }

    // Transform BusinessImage[] (one-to-many)
    const images = source.images;
    if (Array.isArray(images)) {
      transformed.images = images.map((img: unknown) => {
        if (img === null || typeof img !== "object") {
          return img;
        }

        const imgRecord = img as Record<string, unknown>;
        const imgKey = imgRecord.imageKey;

        if (
          typeof imgKey === "string" &&
          this.isValidImageKey(imgKey, "businesses")
        ) {
          return {
            ...imgRecord,
            imageUrl: this.storageService.getObjectUrl(imgKey, "businesses"),
            imageKey: imgKey, // ব্যাকআপ key
          };
        }
        return img;
      }) as unknown;
    }

    // Transform GuestCustomer image
    const guestImageKey = source.imageKey;
    if (
      typeof guestImageKey === "string" &&
      !profileImage && // profile এর সাথে confuse না হওয়ার জন্য
      this.isValidImageKey(guestImageKey, "businesses")
    ) {
      transformed.image = this.storageService.getObjectUrl(
        guestImageKey,
        "businesses",
      );
      transformed.imageKey = guestImageKey; // ব্যাকআপ key
    }

    // Recursively transform nested objects (but exclude relations to prevent infinite loops)
    Object.keys(transformed).forEach((key) => {
      const value = transformed[key];
      if (
        value !== null &&
        typeof value === "object" &&
        !this.isRelationField(key) &&
        key !== "user" && // Prevent circular transformation
        key !== "vendor" &&
        key !== "customer" &&
        key !== "business"
      ) {
        transformed[key] = this.transformImageKeys(value);
      }
    });

    return transformed as unknown;
  }

  /**
   * Validate if string looks like an image key
   */
  private isValidImageKey(key: string, prefix: string): boolean {
    // Must start with the prefix and have reasonable length
    return (
      typeof key === "string" &&
      key.startsWith(prefix) &&
      key.length > 5 &&
      this.isSafeKey(key)
    );
  }

  /**
   * Check if key is safe from path traversal attacks
   */
  private isSafeKey(key: string): boolean {
    // Check for path traversal attempts
    return !key.includes("..") && !key.includes("//");
  }

  /**
   * Check if field is a Prisma relation (should not be transformed)
   */
  private isRelationField(fieldName: string): boolean {
    const relationFieldPatterns = [
      "id",
      "userId",
      "businessId",
      "customerId",
      "vendorId",
      "categoryId",
      "staffId",
      "serviceId",
      "createdAt",
      "updatedAt",
    ];
    return relationFieldPatterns.includes(fieldName);
  }
}
