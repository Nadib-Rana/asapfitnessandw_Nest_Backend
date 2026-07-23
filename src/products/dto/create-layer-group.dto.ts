import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateLayerGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsArray()
  layerIds?: string[];
}

export class UpdateLayerGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class AssignLayerDto {
  @IsString()
  @IsNotEmpty()
  layerId: string;

  @IsOptional()
  @IsString()
  displayLabel?: string;
}
