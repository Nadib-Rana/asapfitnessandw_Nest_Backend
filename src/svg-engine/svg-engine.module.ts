import { Module } from '@nestjs/common';
import { SvgEngineService } from './svg-engine.service';

@Module({
  providers: [SvgEngineService],
  exports: [SvgEngineService],
})
export class SvgEngineModule {}
