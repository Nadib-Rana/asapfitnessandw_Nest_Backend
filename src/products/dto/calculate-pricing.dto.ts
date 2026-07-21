import { IsNumber, IsString, IsOptional, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculatePricingDto {
  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'XL', required: false })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8', required: false })
  @IsUUID()
  @IsOptional()
  materialId?: string;
}
