import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddShapeDto {
  @ApiProperty({ example: 'Full Body' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'http://localhost:9090/media/uploads/123-jersey.svg' })
  @IsString()
  svgUrl: string;

  @ApiProperty({ example: ['jerseyBody', 'collar', 'socks'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  layers?: string[];
}
