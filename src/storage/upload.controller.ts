import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post('admin/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN] Upload a file (SVG, PNG, JPG, etc.) to storage' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully, returns URL.' })
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const bucket = this.storageService.getDefaultBucket();
    const uniqueId = Math.floor(100000 + Math.random() * 900000);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `uploads/${uniqueId}-${sanitizedFilename}`;

    await this.storageService.uploadObject(
      file.buffer,
      bucket,
      key,
      file.mimetype,
    );

    const url = this.storageService.getObjectUrl(key, bucket);
    return { url };
  }
}
