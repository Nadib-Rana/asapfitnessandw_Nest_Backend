/**
 * src/auth/auth.module.ts
 *
 * Authentication module.
 * Provides JWT strategy, guards, and decorators as reusable foundation.
 * Add your auth services (registration, login, password-reset) as feature modules.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ContextModule } from '../common/context/context.module';
import { JwtStrategy } from './jwt.strategy';
import { jwtConstants } from './constants';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || jwtConstants.secret,
        // expiresIn accepts seconds (number) or a string like '1d', '7d', '24h'
        // Cast is required because ConfigService returns string but the type expects StringValue
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '1d') as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}` | number,
        },
      }),
    }),
    ContextModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtModule, JwtStrategy, RolesGuard],
})
export class AuthModule {}
