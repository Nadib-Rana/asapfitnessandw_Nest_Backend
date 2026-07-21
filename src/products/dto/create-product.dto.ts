import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Evolution Football Jersey' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'evolution-football-jersey' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'FOOTBALL' })
  @IsString()
  category: string;

  @ApiProperty({ example: 199.99 })
  @IsNumber()
  basePrice: number;

  @ApiProperty({ example: 'Premium customizable high-performance football jersey.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['http://example.com/jersey.jpg'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isCustomizable?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8', required: false })
  @IsUUID()
  @IsOptional()
  templateId?: string;
}
