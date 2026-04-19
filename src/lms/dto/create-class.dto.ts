import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateClassDto {
  @IsInt()
  @Min(1)
  classOrder: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsString()
  videoKey: string;

  @IsOptional()
  @IsString()
  thumbKey?: string;

  @IsInt()
  @Min(1)
  @Max(86400)
  durationSeconds: number;
}
