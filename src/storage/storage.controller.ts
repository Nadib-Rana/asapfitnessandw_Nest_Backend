import {
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

@Controller("storage")
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("presign-upload")
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
}
