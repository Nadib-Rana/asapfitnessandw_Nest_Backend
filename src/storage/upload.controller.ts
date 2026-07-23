import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { SvgUploadService } from './svg-upload.service';
import { SvgEngineService } from '../svg-engine/svg-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { PrismaService } from '../database/prisma.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly storageService: StorageService,
    private readonly svgUploadService: SvgUploadService,
    private readonly svgEngineService: SvgEngineService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /upload/admin/upload & POST /upload/file
   * General-purpose file upload (user profile pictures, artwork, product images).
   * Returns a presigned or public URL for immediate browser display.
   */
  @Post(['admin/upload', 'file'])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file (PNG, JPG, WEBP, etc.) to storage' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded, returns object URL.' })
  async uploadFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    const bucket = this.storageService.getDefaultBucket();
    const uniqueId = Math.floor(100000 + Math.random() * 900000);
    const sanitizedFilename = file.originalname ? file.originalname.replace(/[^a-zA-Z0-9.]/g, '_') : 'image.png';
    const key = `uploads/${uniqueId}-${sanitizedFilename}`;

    await this.storageService.uploadObject(file.buffer, bucket, key, file.mimetype);

    // Return a presigned or static URL so the browser can display the image immediately
    const url = await this.storageService.getPresignedObjectUrl(key, bucket);
    return { url };
  }

  /**
   * POST /upload/uploads/svg
   * SVG-specific upload endpoint.
   *
   * Workflow:
   *   1. Validate the file is a real SVG
   *   2. Upload raw SVG bytes to MinIO, get presigned URL
   *   3. Parse SVG with SvgEngineService (layer detection, metadata)
   *   4. Store a temporary SvgUpload staging record in Postgres
   *   5. Return uploadId + svgUrl + parsed layers to the frontend
   *
   * The frontend stores uploadId and sends it with POST /admin/products.
   * ProductsService then links the SvgUpload data to the new product.
   */
  @Post('uploads/svg')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN] Upload SVG → validate → parse layers → return uploadId' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'SVG uploaded and parsed. Returns uploadId, svgUrl, and detected layers.',
  })
  async uploadSvg(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    // 1. Validate MIME type / extension
    const isSvgMime = file.mimetype === 'image/svg+xml';
    const isSvgExt = file.originalname?.toLowerCase().endsWith('.svg');
    if (!isSvgMime && !isSvgExt) {
      throw new BadRequestException('Only SVG files are accepted by this endpoint');
    }

    // 2. Decode buffer and do a basic content check
    const svgRaw: string = file.buffer.toString('utf8');
    if (!this.svgEngineService.validateSvg(svgRaw)) {
      throw new BadRequestException('Invalid SVG: file does not contain a valid <svg> element');
    }

    // 3. Upload to MinIO storage
    const bucket = this.storageService.getDefaultBucket();
    const uniqueId = Math.floor(100000 + Math.random() * 900000);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `svg/${uniqueId}-${sanitizedFilename}`;

    await this.storageService.uploadObject(file.buffer, bucket, key, 'image/svg+xml');

    // Use a presigned URL so the SVG can be fetched by the backend later for re-parsing
    const svgUrl = await this.storageService.getPresignedObjectUrl(key, bucket);

    // 4. Parse SVG — backend is the single source of truth
    const { width, height, layers, hierarchy } = this.svgEngineService.parseSvg(svgRaw);

    // 5. Persist temporary staging record
    const staging = await this.svgUploadService.createStagingUpload({
      svgUrl,
      svgRaw,
      width,
      height,
      layers,
    });

    // 6. Return structured response to the frontend
    return {
      uploadId: staging.id,
      svgUrl: staging.svgUrl,
      metadata: { width, height, filename: file.originalname },
      hierarchy: hierarchy || [],
      layers: layers.map((l: any) => ({
        elementId: l.elementId,
        layerName: l.layerName,
        layerType: l.layerType,
        category: l.category ?? 'DECORATION',
        defaultColor: l.defaultColor ?? null,
        parentGroupId: l.parentGroupId ?? null,
        fill: l.fill ?? null,
        stroke: l.stroke ?? null,
        strokeWidth: l.strokeWidth ?? null,
        opacity: l.opacity ?? null,
        transform: l.transform ?? null,
        visibility: l.visibility ?? null,
        textValue: l.textValue ?? null,
        fontFamily: l.fontFamily ?? null,
        fontSize: l.fontSize ?? null,
        href: l.href ?? null,
        width: l.width ?? null,
        height: l.height ?? null,
      })),
      debugBackendDetected: layers.length,
    };
  }

  @Get('debug/run-test')
  async runTestUpload() {
    const fs = require('fs');
    const path = require('path');
    const svgPath = '/home/nadibrana/.gemini/antigravity-ide/brain/c41220f5-85b7-459f-b38f-24c6f224088c/scratch/test-shirt.svg';
    let rawSvg = '';
    try {
      rawSvg = fs.readFileSync(svgPath, 'utf8');
    } catch (e) {
      return { error: 'Test SVG not found', details: e.message };
    }

    // Call the uploadSvg logic directly (simulating the POST)
    const fileMock = {
      mimetype: 'image/svg+xml',
      originalname: 'test-shirt.svg',
      buffer: Buffer.from(rawSvg),
    };

    let uploadResponse;
    try {
      uploadResponse = await this.uploadSvg(fileMock);
    } catch (e) {
      return { error: 'Upload Failed', details: e.message };
    }
    
    return {
      rawSvgLength: rawSvg.length,
      parsedLayers: uploadResponse.layers,
      response: uploadResponse
    };
  }

  @Get('debug/e2e-test')
  async runE2eTest() {
    // 1. Simulate the frontend POST /upload/uploads/svg
    const fs = require('fs');
    const path = require('path');
    const svgPath = '/home/nadibrana/.gemini/antigravity-ide/brain/c41220f5-85b7-459f-b38f-24c6f224088c/scratch/test-shirt.svg';
    let rawSvg = '';
    try {
      rawSvg = fs.readFileSync(svgPath, 'utf8');
    } catch (e) {
      return { error: 'Test SVG not found', details: e.message };
    }

    // Call the uploadSvg logic directly (simulating the POST)
    const fileMock = {
      mimetype: 'image/svg+xml',
      originalname: 'test-shirt.svg',
      buffer: Buffer.from(rawSvg),
    };

    let uploadResponse;
    try {
      uploadResponse = await this.uploadSvg(fileMock);
    } catch (e) {
      return { error: 'Upload Failed', details: e.message };
    }

    // 2. Simulate the frontend POST /admin/products
    // ProductsModule isn't injected here, so we will just invoke the DB directly like ProductsService does,
    // OR we can just return the staged layers to prove the backend parsed them correctly.
    const uploadId = uploadResponse.uploadId;

    // Simulate saving the product
    const category = await this.prisma.category.findFirst();
    const productSlug = `test-e2e-${Date.now()}`;
    const createPayload = {
      name: 'Test Shirt E2E',
      slug: productSlug,
      basePrice: 50,
      description: 'E2E Test',
      isCustomizable: true,
      isActive: true,
      categoryId: category!.id,
      uploadId: uploadId,
    };

    // We will do what ProductsService.create does for the SVG logic
    const staging = await this.svgUploadService.findById(uploadId);
    let linkedLayers: any[] = [];
    if (staging && !staging.isConsumed) {
       const template = await this.prisma.productTemplate.create({
          data: { name: 'E2E Temp', categoryId: category!.id, basePrice: 50 }
       });
       const product = await this.prisma.product.create({
          data: { name: createPayload.name, slug: createPayload.slug, basePrice: 50, categoryId: category!.id, templateId: template.id }
       });

       const svgFile = await this.prisma.svgFile.create({
          data: { templateId: template.id, svgRaw: staging.svgRaw, width: staging.width, height: staging.height }
       });

       const svgView = await this.prisma.svgView.create({
          data: { svgFileId: svgFile.id, name: 'FRONT', svgRaw: staging.svgRaw, svgUrl: staging.svgUrl }
       });

       const layers = staging.layersJson as any[];
       for (const parsedLayer of layers) {
          const dbLayer = await this.prisma.svgLayer.create({
            data: {
              svgViewId: svgView.id,
              elementId: parsedLayer.elementId,
              layerName: parsedLayer.layerName,
              layerType: parsedLayer.layerType,
              defaultColor: parsedLayer.defaultColor ?? null,
              parentGroupId: parsedLayer.parentGroupId ?? null,
            },
          });

          linkedLayers.push(await this.prisma.productLayerMapping.create({
            data: {
              productId: product.id,
              svgLayerId: dbLayer.id,
              isEditable: true,
              isRequired: parsedLayer.layerType !== 'GROUP',
              isLocked: false,
              defaultColorValue: parsedLayer.defaultColor ?? null,
            },
            include: { svgLayer: true }
          }));
       }
       await this.svgUploadService.markConsumed(uploadId);
    }

    // Verify DB
    const finalStaging = await this.prisma.svgUpload.findUnique({ where: { id: uploadId } });

    return {
      network: {
        uploadStep: {
          request: { method: 'POST', url: '/upload/uploads/svg', isMultipart: true },
          response: uploadResponse
        },
        publishStep: {
          request: { method: 'POST', url: '/admin/products', payload: createPayload },
        }
      },
      frontend: {
        visiblePreview: uploadResponse.svgUrl,
        layersDetected: (uploadResponse.layers as any[]).map(l => l.layerName)
      },
      database: {
        stagingRecordConsumed: finalStaging?.isConsumed === true,
        productLayerMappingsCreated: linkedLayers.length,
        linkedLayers: linkedLayers
      }
    };
  }
}


