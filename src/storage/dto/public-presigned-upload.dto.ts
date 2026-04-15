import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class PublicPresignedUploadDto {
  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  bucket?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(10 * 60)
  expirySeconds?: number;
}
