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

  @ApiProperty({
    example: 'c9d8e7f6-a5b4-3210-d1e2-f3g4h5i6j7k8',
    description: 'ID returned by POST /upload/uploads/svg. Links parsed SVG layers to this product.',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  uploadId?: string;

  @ApiProperty({
    example: [
      { name: 'FRONT', svgUrl: 'http://example.com/front.svg' },
      { name: 'BACK', svgUrl: 'http://example.com/back.svg' },
      { name: 'LEFT', svgUrl: 'http://example.com/left.svg' },
      { name: 'RIGHT', svgUrl: 'http://example.com/right.svg' }
    ],
    description: 'Array of multi-view SVG uploads (FRONT, BACK, LEFT, RIGHT) to link to this product in DB.',
    required: false,
  })
  @IsArray()
  @IsOptional()
  views?: Array<{ name: string; uploadId?: string; svgUrl?: string }>;
}
