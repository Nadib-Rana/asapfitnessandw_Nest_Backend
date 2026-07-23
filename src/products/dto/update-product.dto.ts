import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ example: 'Evolution Football Jersey', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'evolution-football-jersey', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'FOOTBALL', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 199.99, required: false })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiProperty({ example: 'Premium description', required: false })
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

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8', required: false })
  @IsUUID()
  @IsOptional()
  uploadId?: string;

  @ApiProperty({
    example: [
      { name: 'FRONT', uploadId: 'c9d8e7f6-a5b4-3210-d1e2-f3g4h5i6j7k8' },
    ],
    required: false,
  })
  @IsArray()
  @IsOptional()
  views?: Array<{ name: string; uploadId?: string; svgUrl?: string }>;
}


