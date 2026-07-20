/**
 * src/auth/dto/login.dto.ts
 *
 * Base login DTO.
 * Supports email + password authentication.
 * Extend or replace with your application's auth requirements.
 */

import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
