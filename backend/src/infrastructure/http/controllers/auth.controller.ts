import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../../application/services/user.service';
import { PasswordService } from '../../security/password.service';
import { AgeVerificationService } from '../../../application/services/age-verification.service';
import { AdminCodeService } from '../../../application/services/admin-code.service';
import { OAuthService } from '../../../application/services/oauth.service';
import { RegisterDto, LoginDto, AuthResponseDto, OAuthLoginDto } from '../../../application/dtos/auth.dto';
import { UserRole } from '../../../domain/entities/user.entity';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
    private readonly ageVerificationService: AgeVerificationService,
    private readonly adminCodeService: AdminCodeService,
    private readonly oauthService: OAuthService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Validate age (must be 18+)
    this.ageVerificationService.validateAge(registerDto.dateOfBirth);

    // Hash the password
    const hashedPassword = await this.passwordService.hashPassword(registerDto.password);

    // All new users are created with USER role
    // Admins must be created through a separate protected endpoint
    const role = UserRole.USER;

    const user = await this.userService.createUser({
      phone: registerDto.phone,
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role,
      dateOfBirth: new Date(registerDto.dateOfBirth),
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

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
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

    // If admin code is provided, validate it
    let role = user.role;
    if (loginDto.adminCode) {
      const isValidAdminCode = await this.adminCodeService.validateAdminCode(
        user.id,
        loginDto.adminCode
      );
      
      if (isValidAdminCode) {
        // Grant admin role for this session
        role = UserRole.ADMIN;
      }
    }

    const payload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: role,
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
        role: role,
        isAdmin: role === UserRole.ADMIN,
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

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @Post('oauth/login')
  @HttpCode(HttpStatus.OK)
  async oauthLogin(@Body() oauthDto: OAuthLoginDto): Promise<AuthResponseDto> {
    // Validate OAuth token and get user info from provider
    const oauthUserInfo = await this.oauthService.validateToken(
      oauthDto.provider,
      oauthDto.token
    );

    // Check if user exists with this OAuth ID
    let user = await this.userService.getUserByOAuthId(
      oauthDto.provider,
      oauthUserInfo.id
    );

    if (!user) {
      // If new OAuth user, they must provide phone and date of birth
      if (!oauthDto.phone || !oauthDto.dateOfBirth) {
        throw new UnauthorizedException(
          'Phone number and date of birth are required for new accounts'
        );
      }

      // Validate age (must be 18+)
      this.ageVerificationService.validateAge(oauthDto.dateOfBirth);

      // Create new user with OAuth credentials
      const oauthFields: any = {};
      if (oauthDto.provider === 'google') oauthFields.googleId = oauthUserInfo.id;
      if (oauthDto.provider === 'apple') oauthFields.appleId = oauthUserInfo.id;
      if (oauthDto.provider === 'facebook') oauthFields.facebookId = oauthUserInfo.id;

      user = await this.userService.createUser({
        phone: oauthDto.phone,
        email: oauthUserInfo.email,
        name: oauthUserInfo.name,
        role: UserRole.USER,
        dateOfBirth: new Date(oauthDto.dateOfBirth),
        ...oauthFields,
      });
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
}
