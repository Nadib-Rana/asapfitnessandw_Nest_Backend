/**
 * src/database/prisma.module.ts
 *
 * Global Prisma database module.
 * Provides PrismaService to the entire application without needing
 * to import this module in every feature module.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
