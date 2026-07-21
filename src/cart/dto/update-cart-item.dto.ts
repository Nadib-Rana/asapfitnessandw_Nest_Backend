import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  quantity: number;
}
