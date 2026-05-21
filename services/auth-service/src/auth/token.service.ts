import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AuthServiceConfigService } from '../config/auth-service.config';
import { AuthRole, StoredUserCredential } from './auth.types';

export type AccessTokenPayload = Readonly<{
  email: string;
  role: AuthRole;
  sub: string;
}>;

@Injectable()
export class TokenService {
  constructor(private readonly config: AuthServiceConfigService) {}

  createAccessToken(user: StoredUserCredential): string {
    const payload: AccessTokenPayload = {
      email: user.email,
      role: user.role,
      sub: user.userId,
    };

    return jwt.sign(payload, this.config.jwtAccessSecret, {
      expiresIn: this.config.jwtExpiresInSeconds,
    });
  }

  createRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  getAccessTokenExpiresInSeconds(): number {
    return this.config.jwtExpiresInSeconds;
  }

  getRefreshTokenExpiresAt(now = new Date()): Date {
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.config.refreshTokenExpiresInDays);
    return expiresAt;
  }
}
