import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

@Injectable()
export class AdminCodeService {
  private readonly externalServiceUrl: string;
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly MAX_ATTEMPTS = 3;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  
  constructor(private readonly configService: ConfigService) {
    // Get the external admin validation service URL from environment
    // This ensures the admin code validation is never embedded in the code
    this.externalServiceUrl = this.configService.get<string>(
      'ADMIN_VALIDATION_SERVICE_URL',
      ''
    );

    // Clean up old rate limit entries every hour
    setInterval(() => this.cleanupRateLimitMap(), 60 * 60 * 1000);
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimitMap(): void {
    const now = Date.now();
    for (const [userId, entry] of this.rateLimitMap.entries()) {
      // Remove entries older than lock duration
      if (now - entry.lastAttempt > this.LOCK_DURATION_MS) {
        this.rateLimitMap.delete(userId);
      }
    }
  }

  /**
   * Check if user is rate limited
   */
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const entry = this.rateLimitMap.get(userId);

    if (!entry) {
      this.rateLimitMap.set(userId, {
        attempts: 1,
        lastAttempt: now
      });
      return;
    }

    // Check if user is locked out
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const remainingMinutes = Math.ceil((entry.lockedUntil - now) / 60000);
      throw new UnauthorizedException(
        `Too many failed attempts. Account locked for ${remainingMinutes} more minute(s).`
      );
    }

    // Reset attempts if window has expired
    if (now - entry.lastAttempt > this.ATTEMPT_WINDOW_MS) {
      entry.attempts = 1;
      entry.lastAttempt = now;
      delete entry.lockedUntil;
      return;
    }

    // Increment attempts
    entry.attempts++;
    entry.lastAttempt = now;

    // Lock account if max attempts exceeded
    if (entry.attempts >= this.MAX_ATTEMPTS) {
      entry.lockedUntil = now + this.LOCK_DURATION_MS;
      throw new UnauthorizedException(
        `Too many failed attempts. Account locked for 15 minutes.`
      );
    }
  }

  /**
   * Record successful admin code validation
   */
  private recordSuccess(userId: string): void {
    this.rateLimitMap.delete(userId);
  }

  /**
   * Validates an admin code against an external secure service
   * CRITICAL: This method calls an external service and NEVER validates codes locally
   * Includes rate limiting to prevent brute force attacks
   * 
   * @param userId - The user ID attempting admin access
   * @param adminCode - The admin code provided by the user
   * @returns Promise<boolean> - true if code is valid, throws otherwise
   * @throws UnauthorizedException if code is invalid or rate limited
   * @throws BadRequestException if external service is not configured
   */
  async validateAdminCode(userId: string, adminCode: string): Promise<boolean> {
    // Check rate limiting first
    this.checkRateLimit(userId);
    // Ensure external service is configured
    if (!this.externalServiceUrl) {
      console.error('Admin validation service URL is not configured');
      throw new BadRequestException(
        'Admin authentication is not available at this time'
      );
    }

    try {
      // Call external validation service
      // The external service is responsible for:
      // 1. Storing admin codes securely
      // 2. Validating codes
      // 3. Logging access attempts
      // 4. Rate limiting
      const response = await axios.post(
        `${this.externalServiceUrl}/validate-admin`,
        {
          userId,
          adminCode,
          timestamp: new Date().toISOString(),
        },
        {
          timeout: 5000, // 5 second timeout
          headers: {
            'Content-Type': 'application/json',
            // Add authentication header for the validation service
            'X-Service-Key': this.configService.get<string>('ADMIN_SERVICE_KEY', ''),
          },
        }
      );

      // Check if validation was successful
      if (response.data && response.data.valid === true) {
        this.recordSuccess(userId);
        return true;
      }

      throw new UnauthorizedException('Invalid admin code');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Admin validation service error:', error.message);
        
        // If it's a 401/403 from the service, it's an invalid code
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new UnauthorizedException('Invalid admin code');
        }
        
        // For other errors, log but don't expose details
        throw new BadRequestException(
          'Unable to verify admin code at this time'
        );
      }
      
      throw new UnauthorizedException('Invalid admin code');
    }
  }

  /**
   * Checks if admin validation is properly configured
   * @returns boolean - true if external service is configured
   */
  isAdminValidationConfigured(): boolean {
    return !!this.externalServiceUrl;
  }
}
