import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Football' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'football' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Football kits and equipment', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8', required: false })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
