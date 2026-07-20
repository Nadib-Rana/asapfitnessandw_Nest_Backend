/**
 * src/common/context/prisma.service.ts
 *
 * Re-exports PrismaService from the canonical database module.
 * This shim is kept for backward compatibility with any code
 * that imports from this location.
 *
 * Prefer importing directly from 'src/database/prisma.service'.
 */

export { PrismaService } from '../../database/prisma.service';
