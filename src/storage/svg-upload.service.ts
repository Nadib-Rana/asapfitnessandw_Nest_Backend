import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ParsedLayer {
  elementId: string;
  layerName: string;
  layerType: 'FILL' | 'STROKE' | 'TEXT' | 'IMAGE' | 'GROUP';
  defaultColor?: string;
  parentGroupId?: string;
}

@Injectable()
export class SvgUploadService {
  constructor(private readonly prisma: PrismaService) {}

  async createStagingUpload(params: {
    svgUrl: string;
    svgRaw: string;
    width: number;
    height: number;
    layers: ParsedLayer[];
  }) {
    // TTL: uploads expire after 2 hours if product is never published
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    return this.prisma.svgUpload.create({
      data: {
        svgUrl: params.svgUrl,
        svgRaw: params.svgRaw,
        width: params.width,
        height: params.height,
        layersJson: params.layers as any,
        expiresAt,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.svgUpload.findUnique({ where: { id } });
  }

  async markConsumed(id: string) {
    return this.prisma.svgUpload.update({
      where: { id },
      data: { isConsumed: true },
    });
  }
}
