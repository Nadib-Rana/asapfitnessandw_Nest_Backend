import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShippingAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  recipientName: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  state: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  postalCode: string;

  @ApiProperty({ example: 'United States' })
  @IsString()
  country: string;

  @ApiProperty({ example: '+12125551234' })
  @IsString()
  phone: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
