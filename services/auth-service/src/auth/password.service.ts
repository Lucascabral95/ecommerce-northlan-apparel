import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { AuthServiceConfigService } from '../config/auth-service.config';

@Injectable()
export class PasswordService {
  constructor(private readonly config: AuthServiceConfigService) {}

  hashPassword(password: string): Promise<string> {
    return hash(password, this.config.bcryptSaltRounds);
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
