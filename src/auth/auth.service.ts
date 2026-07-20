/**
 * src/auth/auth.service.ts
 *
 * Authentication service stub.
 * This is intentionally empty — implement your authentication logic here.
 *
 * Suggested methods to implement:
 *   - register(dto: LoginDto): Promise<{ accessToken: string }>
 *   - login(identifier: string, password: string): Promise<{ accessToken: string }>
 *   - logout(userId: string): Promise<void>
 *   - requestPasswordReset(email: string): Promise<void>
 *   - resetPassword(token: string, newPassword: string): Promise<void>
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  // TODO: Inject PrismaService, JwtService, MailerService as needed
  // constructor(
  //   private readonly prisma: PrismaService,
  //   private readonly jwtService: JwtService,
  // ) {}
}
