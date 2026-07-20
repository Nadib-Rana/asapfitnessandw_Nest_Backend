/**
 * src/app.module.ts
 *
 * Root application module.
 * Registers the global infrastructure:
 *   - ConfigModule   — environment variables
 *   - ContextModule  — request-scoped AsyncLocalStorage context
 *   - AuthModule     — JWT strategy + guards
 *   - PrismaModule   — database connection (global)
 *   - StorageModule  — MinIO / S3 object storage
 *   - MailerModule   — transactional email (only loaded when MAIL_HOST is set)
 *
 * Add your feature modules to the imports array.
 */

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ContextModule } from './common/context/context.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ResponseStandardizationInterceptor } from './common/interceptors/response-standardization.interceptor';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './database/prisma.module';
import { StorageModule } from './storage/storage.module';

// Mail is optional — only register when MAIL_HOST is present in env
const mailModules =
  process.env.MAIL_HOST
    ? [
        (() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { MailerModule } = require('@nestjs-modules/mailer');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { getMailConfig } = require('./mail/mail.config');
          return MailerModule.forRootAsync({
            useFactory: getMailConfig,
            inject: [ConfigService],
          });
        })(),
      ]
    : [];

@Module({
  imports: [
    // --- Infrastructure ---
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ContextModule,
    PrismaModule,
    StorageModule,

    // --- Auth Foundation ---
    AuthModule,

    // --- Mail (loaded only when MAIL_HOST env var is set) ---
    ...mailModules,

    // --- Feature modules go here ---
    // e.g. UsersModule, ProductsModule, OrdersModule
  ],
  providers: [
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseStandardizationInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
