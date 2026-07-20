/**
 * src/mail/mail.config.ts
 *
 * Mailer module configuration factory.
 * Reads SMTP settings from environment variables.
 * Template engine: Handlebars (.hbs files in /templates directory).
 *
 * Required env variables:
 *   MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM, APP_NAME
 */

import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export const getMailConfig = (configService: ConfigService): MailerOptions => ({
  transport: {
    host: configService.get<string>('MAIL_HOST'),
    port: configService.get<number>('MAIL_PORT'),
    secure: false,
    auth: {
      user: configService.get<string>('MAIL_USER'),
      pass: configService.get<string>('MAIL_PASS'),
    },
    tls: {
      rejectUnauthorized: false,
    },
  },
  defaults: {
    from: `"${configService.get<string>('APP_NAME') ?? 'App'}" <${configService.get<string>('MAIL_FROM')}>`,
  },
  template: {
    dir: join(process.cwd(), 'templates'),
    adapter: new HandlebarsAdapter(),
    options: {
      strict: true,
    },
  },
});
