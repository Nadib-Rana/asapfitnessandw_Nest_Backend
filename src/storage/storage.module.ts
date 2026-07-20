/**
 * src/storage/storage.module.ts
 *
 * Object storage module (MinIO / S3-compatible).
 * Exports StorageService for use in any feature module that needs
 * file upload, download, or presigned URL generation.
 *
 * Usage in a feature module:
 *   imports: [StorageModule]
 *
 * Then inject StorageService as usual.
 */

import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
