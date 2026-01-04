import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AdminCodeService {
  private readonly externalServiceUrl: string;
  
  constructor(private readonly configService: ConfigService) {
    // Get the external admin validation service URL from environment
    // This ensures the admin code validation is never embedded in the code
    this.externalServiceUrl = this.configService.get<string>(
      'ADMIN_VALIDATION_SERVICE_URL',
      ''
    );
  }

  /**
   * Validates an admin code against an external secure service
   * CRITICAL: This method calls an external service and NEVER validates codes locally
   * 
   * @param userId - The user ID attempting admin access
   * @param adminCode - The admin code provided by the user
   * @returns Promise<boolean> - true if code is valid, throws otherwise
   * @throws UnauthorizedException if code is invalid
   * @throws BadRequestException if external service is not configured
   */
  async validateAdminCode(userId: string, adminCode: string): Promise<boolean> {
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
