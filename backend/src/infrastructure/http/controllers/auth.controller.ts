import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../../application/services/user.service';
import { PasswordService } from '../../security/password.service';
import { RegisterDto, LoginDto, AuthResponseDto } from '../../../application/dtos/auth.dto';
import { UserRole } from '../../../domain/entities/user.entity';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Hash the password
    const hashedPassword = await this.passwordService.hashPassword(registerDto.password);

    // Determine role based on email pattern (for backward compatibility during migration)
    // ⚠️ SECURITY WARNING: This is for development/migration only!
    // In production, remove this logic and use a separate admin creation endpoint
    // or manual role assignment by existing admins.
    let role = UserRole.USER;
    if (registerDto.email && process.env.NODE_ENV !== 'production') {
      const emailLower = registerDto.email.toLowerCase();
      if (emailLower.includes('admin@') || emailLower.includes('administrador@')) {
        role = UserRole.ADMIN;
      }
    }

    const user = await this.userService.createUser({
      phone: registerDto.phone,
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role,
    });

    const payload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
      },
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find user by phone
    const user = await this.userService.getUserByPhone(loginDto.phone);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
      },
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newAccessToken = this.jwtService.sign({
        sub: payload.sub,
        phone: payload.phone,
        email: payload.email,
        role: payload.role,
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
