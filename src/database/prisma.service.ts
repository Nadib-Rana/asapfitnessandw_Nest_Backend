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
    this.logger.log('Database connected');
  }
}
