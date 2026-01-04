import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  provider: 'google' | 'apple' | 'facebook';
}

@Injectable()
export class OAuthService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Validates a Google OAuth token and returns user information
   * @param token - Google OAuth token
   * @returns OAuthUserInfo
   */
  async validateGoogleToken(token: string): Promise<OAuthUserInfo> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        id: response.data.sub,
        email: response.data.email,
        name: response.data.name,
        provider: 'google',
      };
    } catch (error) {
      console.error('Google token validation error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Validates an Apple OAuth token and returns user information
   * @param token - Apple OAuth token (ID token)
   * @returns OAuthUserInfo
   */
  async validateAppleToken(token: string): Promise<OAuthUserInfo> {
    try {
      // Apple uses JWT tokens that need to be decoded and verified
      // For now, we'll use a simple approach - in production, use apple-auth library
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );

      // Verify the token is for our app
      const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
      if (payload.aud !== clientId) {
        throw new Error('Token audience mismatch');
      }

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        provider: 'apple',
      };
    } catch (error) {
      console.error('Apple token validation error:', error);
      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  /**
   * Validates a Facebook OAuth token and returns user information
   * @param token - Facebook OAuth token
   * @returns OAuthUserInfo
   */
  async validateFacebookToken(token: string): Promise<OAuthUserInfo> {
    try {
      const appId = this.configService.get<string>('FACEBOOK_APP_ID');
      const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');

      // Verify the token with Facebook
      const verifyResponse = await axios.get(
        `https://graph.facebook.com/debug_token`,
        {
          params: {
            input_token: token,
            access_token: `${appId}|${appSecret}`,
          },
        }
      );

      if (!verifyResponse.data.data.is_valid) {
        throw new Error('Invalid token');
      }

      // Get user information
      const userResponse = await axios.get(
        `https://graph.facebook.com/me`,
        {
          params: {
            fields: 'id,name,email',
            access_token: token,
          },
        }
      );

      return {
        id: userResponse.data.id,
        email: userResponse.data.email,
        name: userResponse.data.name,
        provider: 'facebook',
      };
    } catch (error) {
      console.error('Facebook token validation error:', error);
      throw new UnauthorizedException('Invalid Facebook token');
    }
  }

  /**
   * Validates an OAuth token based on provider
   * @param provider - OAuth provider (google, apple, facebook)
   * @param token - OAuth token
   * @returns OAuthUserInfo
   */
  async validateToken(
    provider: 'google' | 'apple' | 'facebook',
    token: string
  ): Promise<OAuthUserInfo> {
    switch (provider) {
      case 'google':
        return this.validateGoogleToken(token);
      case 'apple':
        return this.validateAppleToken(token);
      case 'facebook':
        return this.validateFacebookToken(token);
      default:
        throw new UnauthorizedException('Unsupported OAuth provider');
    }
  }
}
