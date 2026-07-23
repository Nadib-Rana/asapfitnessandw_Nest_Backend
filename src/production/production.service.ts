import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getQueue() {
    return this.prisma.productionQueue.findMany({
      include: {
        orderItem: {
          include: {
            product: true,
            savedDesign: true,
            rosters: {
              include: {
                size: true,
              },
            },
          },
        },
        exportFiles: true,
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  async updateStatus(queueId: string, status: string) {
    const queue = await this.prisma.productionQueue.findUnique({
      where: { id: queueId },
    });
    if (!queue) {
      throw new NotFoundException(`Production queue item with ID '${queueId}' not found`);
    }

    const data: any = { status };
    if (status === 'PRINTING' && !queue.startedAt) {
      data.startedAt = new Date();
    }
    if (status === 'COMPLETED' && !queue.completedAt) {
      data.completedAt = new Date();
    }

    return this.prisma.productionQueue.update({
      where: { id: queueId },
      data,
    });
  }

  async exportItem(queueId: string) {
    const queue = await this.prisma.productionQueue.findUnique({
      where: { id: queueId },
      include: {
        orderItem: {
          include: {
            product: {
              include: {
                template: {
                  include: {
                    svgFile: {
                      include: {
                        views: true,
                      },
                    },
                  },
                },
              },
            },
            savedDesign: true,
          },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException(`Production queue item with ID '${queueId}' not found`);
    }

    const design = queue.orderItem.savedDesign;
    if (!design) {
      throw new BadRequestException('No customization design configuration linked to this order item');
    }

    const config = design.configurationJson as any;
    const colors = config.colors || {};

    const svgFile = queue.orderItem.product.template.svgFile;
    if (!svgFile || svgFile.views.length === 0) {
      throw new BadRequestException('No vector source templates configured for this product template');
    }

    const bucket = this.storageService.getDefaultBucket();
    const exportFiles: any[] = [];

    // Compile each SVG view by injecting colors and text
    const playerText = config.playerText || config.text;
    for (const view of svgFile.views) {
      const compiledSvg = this.compileSvg(view.svgRaw, colors, playerText);
      const key = `production/exports/${queueId}-${view.name}.svg`;

      await this.storageService.uploadObject(
        Buffer.from(compiledSvg, 'utf-8'),
        bucket,
        key,
        'image/svg+xml',
      );

      const fileUrl = this.storageService.getObjectUrl(key, bucket);

      // Save record in export files table
      const exportFile = await this.prisma.productionExportFile.create({
        data: {
          productionQueueId: queueId,
          fileType: 'SVG',
          fileUrl,
        },
      });
      exportFiles.push(exportFile);
    }

    return {
      message: 'Print vector files exported successfully',
      files: exportFiles,
    };
  }

  private compileSvg(
    svgRaw: string,
    colors: Record<string, string>,
    playerText?: any,
  ): string {
    let compiled = svgRaw;

    for (const [layerId, color] of Object.entries(colors)) {
      const tagRegex = new RegExp(`<([a-zA-Z0-9:-]+)[^>]*?(?:id|data-name|name)=["']${layerId}["'][^>]*?>`, 'gi');
      compiled = compiled.replace(tagRegex, (match) => {
        if (match.includes('fill=')) {
          return match.replace(/fill=["'][^"']*?["']/gi, `fill="${color}"`);
        } else {
          if (match.endsWith('/>')) {
            return match.slice(0, -2) + ` fill="${color}"/>`;
          }
          return match.slice(0, -1) + ` fill="${color}">`;
        }
      });
    }

    if (playerText) {
      if (playerText.name) {
        compiled = compiled.replace(
          /(<text[^>]*?(?:id=["'](?:text_name|player_name|name)["'])[^>]*?>)([\s\S]*?)(<\/text>)/gi,
          `$1${playerText.name}$3`,
        );
      }
      if (playerText.number) {
        compiled = compiled.replace(
          /(<text[^>]*?(?:id=["'](?:text_number|player_number|number)["'])[^>]*?>)([\s\S]*?)(<\/text>)/gi,
          `$1${playerText.number}$3`,
        );
      }
    }

    return compiled;
  }
}
