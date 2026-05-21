import { AuthRole, StoredRefreshToken, StoredUserCredential } from './auth.types';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export type CreateUserCredentialInput = Readonly<{
  email: string;
  passwordHash: string;
  role: AuthRole;
  userId: string;
}>;

export type CreateRefreshTokenInput = Readonly<{
  expiresAt: Date;
  tokenHash: string;
  userId: string;
}>;

export interface AuthRepository {
  createRefreshToken(input: CreateRefreshTokenInput): Promise<StoredRefreshToken>;
  createUserCredential(input: CreateUserCredentialInput): Promise<StoredUserCredential>;
  findRefreshTokenByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  findUserByEmail(email: string): Promise<StoredUserCredential | null>;
  findUserByUserId(userId: string): Promise<StoredUserCredential | null>;
  revokeRefreshToken(tokenHash: string, revokedAt: Date): Promise<void>;
}
