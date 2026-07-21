import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ProfileSetupDto } from './dto/profile-setup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
        customer: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            companyName: dto.companyName,
          },
        },
      },
    });

    const token = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'email_verification',
        expiresAt,
      },
    });

    console.log(`[AUTH SERVICE - OTP] Verification code for ${dto.email} is: ${token}`);

    return {
      success: true,
      message: 'Verification code sent to email',
      userId: user.id,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenRecord = await this.prisma.verificationToken.findFirst({
      where: {
        token: dto.token,
        type: 'email_verification',
        used: false,
        expiresAt: { gt: new Date() },
        user: {
          email: dto.email,
        },
      },
      include: {
        user: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.verificationToken.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    });

    const payload = {
      sub: tokenRecord.user.id,
      role: tokenRecord.user.role,
      email: tokenRecord.user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
        fullName: `${tokenRecord.user.customer?.firstName} ${tokenRecord.user.customer?.lastName}`,
      },
    };
  }

  async setupProfile(userId: string, dto: ProfileSetupDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const dobDate = dto.dob ? new Date(dto.dob) : null;

    await this.prisma.customer.update({
      where: { userId },
      data: {
        dob: dobDate,
        gender: dto.gender,
        address: dto.address,
        profileImageUrl: dto.profileImageUrl,
      },
    });

    return {
      success: true,
      message: 'Profile setup completed successfully',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        customer: true,
        admin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is deactivated');
    }

    const fullName =
      user.role === 'ADMIN'
        ? user.admin?.department || 'Administrator'
        : `${user.customer?.firstName} ${user.customer?.lastName}`;

    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      fullName,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName,
      },
    };
  }
}
