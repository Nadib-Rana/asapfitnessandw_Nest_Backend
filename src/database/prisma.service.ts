/**
 * src/database/prisma.service.ts
 *
 * Prisma client service.
 * Uses the @prisma/adapter-pg PostgreSQL adapter for connection pooling support.
 *
 * Usage in feature services:
 *   constructor(private readonly prisma: PrismaService) {}
 */

import 'dotenv/config';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Prisma 7 uses a factory function pattern; PrismaClient is typed via a conditional
// type. We cast using 'any' only in the constructor chain to avoid the strict
// type assertion issue, but all database access through `this.prisma.*` is fully typed.
@Injectable()
export class PrismaService extends (PrismaClient as new (...args: unknown[]) => PrismaClient) implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      ssl:
        process.env.DATABASE_SSL === 'true'
          ? { rejectUnauthorized: false }
          : undefined,
    });
    super({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  async onModuleInit() {
    this.logger.log('Database connected. Verifying database schema columns...');
    try {
      await this.$executeRawUnsafe(`
        ALTER TABLE "svg_files" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "text_value" TEXT;
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "font_family" VARCHAR(100);
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "font_size" VARCHAR(50);
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "font_weight" VARCHAR(50);
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "text_anchor" VARCHAR(50);
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "href" VARCHAR(512);
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "width" VARCHAR(50);
        ALTER TABLE "svg_layers" ADD COLUMN IF NOT EXISTS "height" VARCHAR(50);
        ALTER TABLE "svg_layers" ALTER COLUMN "default_color" TYPE VARCHAR(255);
        ALTER TABLE "product_layer_mappings" ALTER COLUMN "default_color_value" TYPE VARCHAR(255);
        ALTER TABLE "product_layer_mappings" ADD COLUMN IF NOT EXISTS "placeholder" VARCHAR(255);
        ALTER TABLE "product_layer_mappings" ADD COLUMN IF NOT EXISTS "max_chars" INTEGER;
        ALTER TABLE "product_layer_mappings" ADD COLUMN IF NOT EXISTS "min_chars" INTEGER;
        ALTER TABLE "product_layer_mappings" ADD COLUMN IF NOT EXISTS "allowed_fonts_json" JSONB;
        ALTER TABLE "product_layer_mappings" ADD COLUMN IF NOT EXISTS "allowed_formats_json" JSONB;
        ALTER TABLE "product_layer_mappings" ADD COLUMN IF NOT EXISTS "max_size_bytes" INTEGER;
      `);
      this.logger.log('Database schema columns checked and verified successfully.');
    } catch (err: any) {
      this.logger.error(`Error ensuring database columns: ${err.message}`);
    }
  }
}
