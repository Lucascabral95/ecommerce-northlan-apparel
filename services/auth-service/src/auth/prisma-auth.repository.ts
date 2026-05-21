import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthRepository,
  CreateRefreshTokenInput,
  CreateUserCredentialInput,
} from './auth.repository';
import { AuthRole, StoredRefreshToken, StoredUserCredential } from './auth.types';

type PrismaUserCredential = Awaited<ReturnType<PrismaService['userCredential']['findUnique']>>;
type PrismaRefreshToken = Awaited<ReturnType<PrismaService['refreshToken']['findUnique']>>;

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUserCredential(input: CreateUserCredentialInput): Promise<StoredUserCredential> {
    const user = await this.prisma.userCredential.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        userId: input.userId,
      },
    });

    return mapUserCredential(user);
  }

  async findUserByEmail(email: string): Promise<StoredUserCredential | null> {
    const user = await this.prisma.userCredential.findUnique({
      where: { email },
    });

    return user ? mapUserCredential(user) : null;
  }

  async findUserByUserId(userId: string): Promise<StoredUserCredential | null> {
    const user = await this.prisma.userCredential.findUnique({
      where: { userId },
    });

    return user ? mapUserCredential(user) : null;
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<StoredRefreshToken> {
    const token = await this.prisma.refreshToken.create({
      data: {
        expiresAt: input.expiresAt,
        tokenHash: input.tokenHash,
        userId: input.userId,
      },
    });

    return mapRefreshToken(token);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    return token ? mapRefreshToken(token) : null;
  }

  async revokeRefreshToken(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.update({
      data: { revokedAt },
      where: { tokenHash },
    });
  }
}

function mapUserCredential(user: NonNullable<PrismaUserCredential>): StoredUserCredential {
  return {
    createdAt: user.createdAt,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role as AuthRole,
    userId: user.userId,
  };
}

function mapRefreshToken(token: NonNullable<PrismaRefreshToken>): StoredRefreshToken {
  return {
    expiresAt: token.expiresAt,
    id: token.id,
    revokedAt: token.revokedAt,
    tokenHash: token.tokenHash,
    userId: token.userId,
  };
}
