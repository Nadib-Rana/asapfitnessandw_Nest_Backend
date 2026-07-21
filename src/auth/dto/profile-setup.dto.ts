import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileSetupDto {
  @ApiProperty({ example: '2005-01-10' })
  @IsString()
  dob: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  gender: string;

  @ApiProperty({ example: '221B Baker Street, London' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'http://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  profileImageUrl?: string;
}
