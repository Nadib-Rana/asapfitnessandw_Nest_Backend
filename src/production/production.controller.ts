import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Production')
@Controller('admin/production')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] List all items in the print production station queue' })
  @ApiResponse({ status: 200, description: 'Returns active production queue items.' })
  getQueue() {
    return this.productionService.getQueue();
  }

  @Put(':id/status')
  @ApiOperation({ summary: '[ADMIN] Transition order item production status' })
  @ApiResponse({ status: 200, description: 'Fulfillment status updated.' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.productionService.updateStatus(id, body.status);
  }

  @Post(':id/export')
  @ApiOperation({ summary: '[ADMIN] Compile customizer choices and export print-ready vector file' })
  @ApiResponse({ status: 200, description: 'Print-ready SVG vector successfully exported to S3 storage.' })
  exportItem(@Param('id') id: string) {
    return this.productionService.exportItem(id);
  }
}
