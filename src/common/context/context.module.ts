/**
 * src/common/context/context.module.ts
 *
 * Global module providing request-scoped context via AsyncLocalStorage.
 * Provides ContextService to the entire application.
 *
 * ContextService is used by:
 *   - RequestIdMiddleware (to set request ID)
 *   - AllExceptionsFilter (to read request ID for error responses)
 *   - ResponseStandardizationInterceptor (to attach request ID to responses)
 */

import { Global, Module } from '@nestjs/common';
import { ContextService } from './context.service';

@Global()
@Module({
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
