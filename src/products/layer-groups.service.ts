import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLayerGroupDto, UpdateLayerGroupDto, AssignLayerDto } from './dto/create-layer-group.dto';

@Injectable()
export class LayerGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGroups(productId: string) {
    const groups = await this.prisma.layerGroup.findMany({
      where: { productId },
      include: {
        groupLayers: {
          include: { svgLayer: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    return groups;
  }

  async createGroup(productId: string, dto: CreateLayerGroupDto) {
    const count = await this.prisma.layerGroup.count({ where: { productId } });
    const group = await this.prisma.layerGroup.create({
      data: {
        productId,
        name: dto.name,
        isLocked: dto.isLocked ?? false,
        isVisible: dto.isVisible ?? true,
        displayOrder: count,
      },
    });

    if (dto.layerIds && dto.layerIds.length > 0) {
      for (let i = 0; i < dto.layerIds.length; i++) {
        const svgLayerId = dto.layerIds[i];
        await this.prisma.layerGroupLayer.create({
          data: {
            groupId: group.id,
            svgLayerId,
            displayOrder: i,
          },
        });
      }
    }

    return this.getGroupById(group.id);
  }

  async getGroupById(groupId: string) {
    const group = await this.prisma.layerGroup.findUnique({
      where: { id: groupId },
      include: {
        groupLayers: {
          include: { svgLayer: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!group) throw new NotFoundException(`Layer group '${groupId}' not found`);
    return group;
  }

  async updateGroup(groupId: string, dto: UpdateLayerGroupDto) {
    await this.prisma.layerGroup.update({
      where: { id: groupId },
      data: dto,
    });
    return this.getGroupById(groupId);
  }

  async deleteGroup(groupId: string) {
    await this.prisma.layerGroup.delete({ where: { id: groupId } });
    return { success: true, message: 'Group deleted successfully' };
  }

  async assignLayer(groupId: string, dto: AssignLayerDto) {
    const count = await this.prisma.layerGroupLayer.count({ where: { groupId } });
    await this.prisma.layerGroupLayer.upsert({
      where: {
        groupId_svgLayerId: {
          groupId,
          svgLayerId: dto.layerId,
        },
      },
      create: {
        groupId,
        svgLayerId: dto.layerId,
        displayLabel: dto.displayLabel,
        displayOrder: count,
      },
      update: {
        displayLabel: dto.displayLabel,
      },
    });
    return this.getGroupById(groupId);
  }

  async removeLayer(groupId: string, svgLayerId: string) {
    await this.prisma.layerGroupLayer.deleteMany({
      where: { groupId, svgLayerId },
    });
    return this.getGroupById(groupId);
  }
}
