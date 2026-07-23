import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductShapesService } from './product-shapes.service';
import { ProductConfigService } from './product-config.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SvgEngineModule } from '../svg-engine/svg-engine.module';
import { StorageModule } from '../storage/storage.module';

import { LayerGroupsController } from './layer-groups.controller';
import { LayerGroupsService } from './layer-groups.service';

@Module({
  imports: [PrismaModule, AuthModule, SvgEngineModule, StorageModule],
  controllers: [ProductsController, LayerGroupsController],
  providers: [ProductsService, ProductShapesService, ProductConfigService, LayerGroupsService],
  exports: [ProductsService, ProductShapesService, ProductConfigService, LayerGroupsService],
})
export class ProductsModule {}
