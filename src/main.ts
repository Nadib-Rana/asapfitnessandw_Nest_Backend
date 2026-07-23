/**
 * src/main.ts
 *
 * Application bootstrap.
 * Configures:
 *   - CORS (origins from CORS_ORIGINS env variable)
 *   - Global ValidationPipe (whitelist, transform, strict)
 *   - Global AllExceptionsFilter
 *   - Swagger API documentation
 */

import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ContextService } from './common/context/context.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- CORS ---
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : true;

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve uploaded files statically
  const express = require('express');
  const path = require('path');
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // --- Global Prefix (optional) ---
  // app.setGlobalPrefix('api/v1');

  // --- Global Validation Pipe ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints;
          if (constraints) {
            return Object.values(constraints).join(', ');
          }
          return `Validation failed for ${error.property}`;
        });
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          error: 'Validation Failed',
        });
      },
    }),
  );

  // --- Global Exception Filter ---
  const httpAdapterHost = app.get(HttpAdapterHost);
  const contextService = app.get(ContextService);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, contextService));

  // --- Swagger ---
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(process.env.APP_NAME || 'NestJS API')
      .setDescription('API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log(`Swagger docs available at: /docs`);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
