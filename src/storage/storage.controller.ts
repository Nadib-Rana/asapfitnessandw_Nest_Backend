import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { StorageService } from "./storage.service";
import { PresignedUploadDto } from "./dto/presigned-upload.dto";
import { PresignedDownloadDto } from "./dto/presigned-download.dto";
import { ObjectUrlQueryDto } from "./dto/object-url-query.dto";
import { DeleteObjectDto } from "./dto/delete-object.dto";
import { PublicPresignedUploadDto } from "./dto/public-presigned-upload.dto";

@Controller("storage")
export class StorageController {
  private readonly publicUploadPrefix =
    process.env.STORAGE_PUBLIC_UPLOAD_PREFIX ?? "temp/registrations/";
  private readonly publicUploadBucket =
    process.env.STORAGE_PUBLIC_UPLOAD_BUCKET ?? "profiles";

  constructor(private readonly storageService: StorageService) {}

  @Post("public/presign-upload")
  @ResponseMessage("Public upload URL generated successfully")
  async getPublicPresignedUploadUrl(@Body() dto: PublicPresignedUploadDto) {
    const bucket = dto.bucket ?? this.publicUploadBucket;
    const trimmedKey = dto.key.trim();

    if (!this.isAllowedPublicUploadKey(trimmedKey)) {
      throw new BadRequestException(
        `key must start with '${this.publicUploadPrefix}' and be a safe object key`,
      );
    }

    const expirySeconds = dto.expirySeconds ?? 600;
    const uploadUrl = await this.storageService.getPresignedUploadUrl(
      trimmedKey,
      bucket,
      expirySeconds,
    );

    return {
      key: trimmedKey,
      bucket,
      method: "PUT",
      expiresIn: expirySeconds,
      uploadUrl,
      temporary: true,
    };
  }

  @Post("presign-upload")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Upload URL generated successfully")
  async getPresignedUploadUrl(@Body() dto: PresignedUploadDto) {
    const bucket = dto.bucket ?? this.storageService.getDefaultBucket();
    const uploadUrl = await this.storageService.getPresignedUploadUrl(
      dto.key,
      bucket,
      dto.expirySeconds,
    );

    return {
      key: dto.key,
      bucket,
      method: "PUT",
      expiresIn: dto.expirySeconds ?? undefined,
      uploadUrl,
    };
  }

  @Post("presign-download")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Download URL generated successfully")
  async getPresignedDownloadUrl(@Body() dto: PresignedDownloadDto) {
    const bucket = dto.bucket ?? this.storageService.getDefaultBucket();
    const downloadUrl = await this.storageService.getPresignedObjectUrl(
      dto.key,
      bucket,
      dto.expirySeconds,
    );

    return {
      key: dto.key,
      bucket,
      expiresIn: dto.expirySeconds ?? undefined,
      downloadUrl,
    };
  }

  @Get("object-url")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Object URL generated successfully")
  getObjectUrl(@Query() query: ObjectUrlQueryDto) {
    const bucket = query.bucket ?? this.storageService.getDefaultBucket();

    return {
      key: query.key,
      bucket,
      objectUrl: this.storageService.getObjectUrl(query.key, bucket),
    };
  }

  @Delete("object")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Object deleted successfully")
  async deleteObject(@Body() dto: DeleteObjectDto) {
    const bucket = dto.bucket ?? this.storageService.getDefaultBucket();
    const deleted = await this.storageService.removeObject(dto.key, bucket);

    return {
      key: dto.key,
      bucket,
      deleted,
    };
  }

  private isAllowedPublicUploadKey(key: string): boolean {
    return (
      key.length > this.publicUploadPrefix.length &&
      key.startsWith(this.publicUploadPrefix) &&
      !key.includes("..") &&
      !key.includes("//") &&
      !key.startsWith("http://") &&
      !key.startsWith("https://")
    );
  }
}
