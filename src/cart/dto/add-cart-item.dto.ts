import { IsUUID, IsNumber, Min, IsObject, IsArray, IsOptional, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class RosterItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8' })
  @IsUUID()
  sizeId: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: '10' })
  @IsString()
  number: string;
}

export class AddCartItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: { colors: { jerseyBody: '#ff0000' }, pattern: 'classic' } })
  @IsObject()
  configurationJson: any;

  @ApiProperty({ type: [RosterItemDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RosterItemDto)
  roster?: RosterItemDto[];
}
