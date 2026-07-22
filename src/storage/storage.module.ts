import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SvgUploadService } from './svg-upload.service';
import { UploadController } from './upload.controller';
import { PrismaModule } from '../database/prisma.module';
import { SvgEngineModule } from '../svg-engine/svg-engine.module';

@Module({
  imports: [PrismaModule, SvgEngineModule],
  controllers: [UploadController],
  providers: [StorageService, SvgUploadService],
  exports: [StorageService, SvgUploadService],
})
export class StorageModule {}
