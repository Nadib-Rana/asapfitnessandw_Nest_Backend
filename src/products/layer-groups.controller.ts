import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { LayerGroupsService } from './layer-groups.service';
import { CreateLayerGroupDto, UpdateLayerGroupDto, AssignLayerDto } from './dto/create-layer-group.dto';

@Controller('products/:productId/layer-groups')
export class LayerGroupsController {
  constructor(private readonly layerGroupsService: LayerGroupsService) {}

  @Get()
  async getGroups(@Param('productId') productId: string) {
    return this.layerGroupsService.getGroups(productId);
  }

  @Post()
  async createGroup(
    @Param('productId') productId: string,
    @Body() dto: CreateLayerGroupDto,
  ) {
    return this.layerGroupsService.createGroup(productId, dto);
  }

  @Put(':groupId')
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateLayerGroupDto,
  ) {
    return this.layerGroupsService.updateGroup(groupId, dto);
  }

  @Delete(':groupId')
  async deleteGroup(@Param('groupId') groupId: string) {
    return this.layerGroupsService.deleteGroup(groupId);
  }

  @Post(':groupId/layers')
  async assignLayer(
    @Param('groupId') groupId: string,
    @Body() dto: AssignLayerDto,
  ) {
    return this.layerGroupsService.assignLayer(groupId, dto);
  }

  @Delete(':groupId/layers/:svgLayerId')
  async removeLayer(
    @Param('groupId') groupId: string,
    @Param('svgLayerId') svgLayerId: string,
  ) {
    return this.layerGroupsService.removeLayer(groupId, svgLayerId);
  }
}
