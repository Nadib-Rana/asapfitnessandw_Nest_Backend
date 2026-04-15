import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ContextModule } from "./common/context/context.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { ResponseStandardizationInterceptor } from "./common/interceptors/response-standardization.interceptor";
import { ImageTransformInterceptor } from "./common/interceptors/image-transform.interceptor";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getMailConfig } from "./mail/mail.config";
import { MailerModule } from "@nestjs-modules/mailer";
import { PrismaModule } from "./prisma.module";
import { StorageService } from "./storage/storage.service";
import { UsersModule } from "./users/users.module";
import { LmsModule } from "./lms/lms.module";
import { EnrollmentModule } from "./enrollment/enrollment.module";
import { ShopModule } from "./shop/shop.module";
import { OrderModule } from "./order/order.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    MailerModule.forRootAsync({
      useFactory: getMailConfig,
      inject: [ConfigService],
    }),
    ContextModule,
    AuthModule,
    PrismaModule,
    UsersModule,
    LmsModule,
    EnrollmentModule,
    ShopModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    StorageService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ImageTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseStandardizationInterceptor,
    },
    Reflector,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
