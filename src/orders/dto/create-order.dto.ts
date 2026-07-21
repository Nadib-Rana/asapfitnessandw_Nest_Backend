import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8' })
  @IsUUID()
  shippingAddressId: string;

  @ApiProperty({ example: 'SAVE20', required: false })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ example: 'data:image/png;base64,iVBORw0KGgo...', required: false })
  @IsString()
  @IsOptional()
  signatureUrl?: string;
}
