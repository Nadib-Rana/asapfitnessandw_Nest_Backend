import { Injectable } from "@nestjs/common";
import { Client as MinioClient } from "minio";
import * as fs from "fs";
import * as path from "path";

type ObjectAccessInfo = {
  url: string;
  restricted: boolean;
  accessType: "public" | "private-presigned";
};

@Injectable()
export class StorageService {
  private readonly defaultBucket =
    process.env.STORAGE_DEFAULT_BUCKET ??
    process.env.MINIO_BUCKET_NAME ??
    "media";
  private readonly publicEndpoint =
    process.env.STORAGE_PUBLIC_URL ?? process.env.MINIO_PUBLIC_URL ?? "";
  private readonly defaultExpirySeconds = Number(
    process.env.STORAGE_PRESIGNED_EXPIRY_SECONDS ?? 86400, // 24 Hours
  );
  private readonly profilesBucketName =
    process.env.STORAGE_PUBLIC_UPLOAD_BUCKET ?? "profiles";
  private readonly minioClient: MinioClient | null;

  constructor() {
    const endPoint = process.env.STORAGE_ENDPOINT ?? process.env.MINIO_ENDPOINT;
    const accessKey =
      process.env.STORAGE_ACCESS_KEY ?? process.env.MINIO_ACCESS_KEY;
    const secretKey =
      process.env.STORAGE_SECRET_KEY ?? process.env.MINIO_SECRET_KEY;
    const port = Number(
      process.env.STORAGE_PORT ?? process.env.MINIO_PORT ?? 9000,
    );
    const useSSL =
      (process.env.STORAGE_USE_SSL ?? process.env.MINIO_USE_SSL ?? "false") ===
      "true";

    if (!endPoint || !accessKey || !secretKey) {
      this.minioClient = null;
      return;
    }

    try {
      this.minioClient = new MinioClient({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
    } catch {
      this.minioClient = null;
    }
  }

  isConfigured(): boolean {
    return this.minioClient !== null;
  }

  cleanKey(key?: string | null): string {
    if (!key || typeof key !== "string") {
      return "";
    }
    if (key.startsWith("data:") || key.includes("unsplash.com")) {
      return key;
    }

    let clean = key;
    if (clean.includes("?")) {
      clean = clean.split("?")[0];
    }
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      const match =
        clean.match(/\/(uploads\/[^\/]+)$/i) ||
        clean.match(/\/(svg\/[^\/]+)$/i) ||
        clean.match(/\/(production\/[^\/]+)$/i) ||
        clean.match(/\/([^\/]+)$/);
      if (match) {
        clean = match[1];
      }
    }
    return clean;
  }

  getObjectUrl(key?: string | null, bucket = this.defaultBucket): string {
    if (!key || typeof key !== "string") {
      return "";
    }
    if (key.startsWith("data:") || key.includes("unsplash.com")) {
      return key;
    }

    const cleanKey = this.cleanKey(key);
    const cleanFilename = cleanKey
      .replace(/^uploads\//i, "")
      .replace(/^svg\//i, "")
      .replace(/^production\//i, "")
      .replace(/^\/+/, "");

    return `/uploads/${cleanFilename}`;
  }

  getDefaultBucket(): string {
    return this.defaultBucket;
  }

  isPublicReadBucket(bucket: string): boolean {
    return true;
  }

  async getObjectAccessInfo(
    key?: string | null,
    bucket = this.defaultBucket,
  ): Promise<ObjectAccessInfo> {
    return {
      url: await this.getPresignedObjectUrl(key, bucket),
      restricted: false,
      accessType: "public",
    };
  }

  async getPresignedObjectUrl(
    key?: string | null,
    bucket = this.defaultBucket,
    expirySeconds = this.defaultExpirySeconds,
  ): Promise<string> {
    if (!key || typeof key !== "string") {
      return "";
    }
    if (key.startsWith("data:") || key.includes("unsplash.com")) {
      return key;
    }

    const cleanKey = this.cleanKey(key);

    if (this.minioClient) {
      try {
        await this.ensureBucketExists(bucket);
        const objectKey =
          cleanKey.startsWith("uploads/") ||
          cleanKey.startsWith("svg/") ||
          cleanKey.startsWith("production/")
            ? cleanKey
            : `uploads/${cleanKey.replace(/^\/+/, "")}`;
        return await this.minioClient.presignedGetObject(bucket, objectKey, expirySeconds);
      } catch (err) {
        return this.getObjectUrl(cleanKey, bucket);
      }
    }

    return this.getObjectUrl(cleanKey, bucket);
  }

  async getPresignedUploadUrl(
    key: string,
    bucket = this.defaultBucket,
    expirySeconds = this.defaultExpirySeconds,
  ): Promise<string> {
    return this.getPresignedObjectUrl(key, bucket, expirySeconds);
  }

  async uploadObject(
    buffer: Buffer,
    bucket = this.defaultBucket,
    key: string,
    contentType?: string,
  ): Promise<void> {
    // 1. Save to local disk ./uploads directory served statically by NestJS port 3000
    const cleanFilename = key.replace(/^uploads\//i, "").replace(/^\/+/, "");
    const targetDir = path.join(process.cwd(), "uploads");
    const targetPath = path.join(targetDir, cleanFilename);
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, buffer);

    // 2. Also upload object to MinIO bucket
    if (this.minioClient) {
      try {
        await this.ensureBucketExists(bucket);
        const objectKey = key.startsWith("uploads/") ? key : `uploads/${cleanFilename}`;
        const metaData = contentType ? { "Content-Type": contentType } : undefined;
        await this.minioClient.putObject(bucket, objectKey, buffer, buffer.length, metaData);
      } catch (err) {
        console.warn("MinIO sync notice:", err);
      }
    }
  }

  async removeObject(key: string, bucket = this.defaultBucket): Promise<boolean> {
    const cleanFilename = key.replace(/^uploads\//i, "").replace(/^\/+/, "");
    const targetPath = path.join(process.cwd(), "uploads", cleanFilename);
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch {}
    }

    if (this.minioClient) {
      try {
        const objectKey = key.startsWith("uploads/") ? key : `uploads/${cleanFilename}`;
        await this.minioClient.removeObject(bucket, objectKey);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  private async ensureBucketExists(bucket: string): Promise<void> {
    if (!this.minioClient) return;
    try {
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(bucket);
      }
    } catch (err) {
      // Ignored
    }
  }
}
