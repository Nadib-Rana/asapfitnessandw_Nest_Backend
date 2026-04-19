import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateClassDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  classOrder?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  videoKey?: string;

  @IsOptional()
  @IsString()
  thumbKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(86400)
  durationSeconds?: number;
}
