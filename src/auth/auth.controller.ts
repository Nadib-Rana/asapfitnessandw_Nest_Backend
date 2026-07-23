import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ProfileSetupDto } from './dto/profile-setup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account (Step 1)' })
  @ApiResponse({ status: 201, description: 'User successfully created, OTP generated.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify OTP code and retrieve access token (Step 2)' })
  @ApiResponse({ status: 200, description: 'Email successfully verified, JWT returned.' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('setup-profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup additional customer profile information (Step 3)' })
  @ApiResponse({ status: 200, description: 'Profile setup successfully completed.' })
  setupProfile(@Req() req: any, @Body() dto: ProfileSetupDto) {
    const userId = req.user.userId;
    return this.authService.setupProfile(userId, dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a customer' })
  @ApiResponse({ status: 200, description: 'Authentication successful, JWT returned.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Authenticate an administrator' })
  @ApiResponse({ status: 200, description: 'Admin authentication successful, JWT returned.' })
  adminLogin(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve active authenticated user details' })
  @ApiResponse({ status: 200, description: 'Returns current user session details.' })
  getMe(@Req() req: any) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.authService.getMe(userId);
  }
}
