import { Injectable } from "@nestjs/common";
import { Client as MinioClient } from "minio";

@Injectable()
export class StorageService {
  private readonly defaultBucket =
    process.env.STORAGE_DEFAULT_BUCKET ?? "media";
  private readonly publicEndpoint = process.env.STORAGE_PUBLIC_URL ?? "";
  private readonly defaultExpirySeconds = Number(
    process.env.STORAGE_PRESIGNED_EXPIRY_SECONDS ?? 900,
  );
  private readonly minioClient: MinioClient | null;

  constructor() {
    const endPoint = process.env.STORAGE_ENDPOINT;
    const accessKey = process.env.STORAGE_ACCESS_KEY;
    const secretKey = process.env.STORAGE_SECRET_KEY;
    const port = Number(process.env.STORAGE_PORT ?? 9000);
    const useSSL = (process.env.STORAGE_USE_SSL ?? "false") === "true";

    if (!endPoint || !accessKey || !secretKey) {
      this.minioClient = null;
      return;
    }

    this.minioClient = new MinioClient({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  getObjectUrl(key: string, bucket: string): string {
    const endpoint = this.publicEndpoint;

    if (!endpoint) {
      return key;
    }

    const normalizedBase = endpoint.replace(/\/+$/, "");
    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${normalizedBase}/${bucket}/${encodedKey}`;
  }

  getDefaultBucket(): string {
    return this.defaultBucket;
  }

  async getPresignedObjectUrl(
    key: string,
    bucket: string,
    expirySeconds = this.defaultExpirySeconds,
  ): Promise<string> {
    if (!this.minioClient) {
      return this.getObjectUrl(key, bucket);
    }

    const safeExpiry = Number.isFinite(expirySeconds)
      ? Math.max(60, Math.floor(expirySeconds))
      : this.defaultExpirySeconds;

    try {
      return await this.minioClient.presignedGetObject(bucket, key, safeExpiry);
    } catch {
      return this.getObjectUrl(key, bucket);
    }
  }

  async getPresignedUploadUrl(
    key: string,
    bucket: string,
    expirySeconds = this.defaultExpirySeconds,
  ): Promise<string> {
    if (!this.minioClient) {
      return this.getObjectUrl(key, bucket);
    }

    const safeExpiry = Number.isFinite(expirySeconds)
      ? Math.max(60, Math.floor(expirySeconds))
      : this.defaultExpirySeconds;

    try {
      return await this.minioClient.presignedPutObject(bucket, key, safeExpiry);
    } catch {
      return this.getObjectUrl(key, bucket);
    }
  }

  async uploadObject(
    buffer: Buffer,
    bucket: string,
    key: string,
    contentType?: string,
  ): Promise<void> {
    if (!this.minioClient) {
      throw new Error("Storage service is not configured");
    }

    const metaData = contentType ? { "Content-Type": contentType } : undefined;

    await this.minioClient.putObject(
      bucket,
      key,
      buffer,
      buffer.length,
      metaData,
    );
  }

  async removeObject(key: string, bucket: string): Promise<boolean> {
    if (!this.minioClient) {
      return false;
    }

    try {
      await this.minioClient.removeObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }
}
