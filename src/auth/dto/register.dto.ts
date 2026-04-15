import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export enum UserRole {
  CUSTOMER = "customer",
  VENDOR = "vendor",
}

export class RegisterDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  avatarKey?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  ref?: string;
}
