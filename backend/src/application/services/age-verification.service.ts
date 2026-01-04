import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class AgeVerificationService {
  private readonly MINIMUM_AGE = 18;

  /**
   * Validates that a user meets the minimum age requirement
   * @param dateOfBirth - Date of birth in ISO string format
   * @throws BadRequestException if user is under 18
   */
  validateAge(dateOfBirth: string): void {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException('Invalid date of birth format');
    }

    // Check if date is in the future
    if (birthDate > today) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validate minimum age
    if (age < this.MINIMUM_AGE) {
      throw new BadRequestException(
        `You must be at least ${this.MINIMUM_AGE} years old to use this service`
      );
    }
  }

  /**
   * Calculates the age from a date of birth
   * @param dateOfBirth - Date of birth
   * @returns Age in years
   */
  calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
