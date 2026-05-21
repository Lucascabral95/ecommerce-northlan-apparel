import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AUTH_REPOSITORY, AuthRepository } from './auth.repository';
import { AuthSession, LoginInput, RegisterInput, StoredUserCredential } from './auth.types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UserRegisteredPublisher } from './user-registered.publisher';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly userRegisteredPublisher: UserRegisteredPublisher,
  ) {}

  async register(input: RegisterInput, correlationId: string, causationId?: string): Promise<AuthSession> {
    const email = normalizeEmail(input.email);
    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const user = await this.repository.createUserCredential({
      email,
      passwordHash: await this.passwordService.hashPassword(input.password),
      role: 'USER',
      userId: randomUUID(),
    });

    await this.userRegisteredPublisher.publish(
      {
        email: user.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: user.role,
        userId: user.userId,
      },
      correlationId,
      causationId,
    );

    return this.createSession(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.repository.findUserByEmail(normalizeEmail(input.email));
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verifyPassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.repository.findUserByUserId(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    await this.repository.revokeRefreshToken(tokenHash, new Date());
    return this.createSession(user);
  }

  private async createSession(user: StoredUserCredential): Promise<AuthSession> {
    const refreshToken = this.tokenService.createRefreshToken();

    await this.repository.createRefreshToken({
      expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
      tokenHash: this.tokenService.hashRefreshToken(refreshToken),
      userId: user.userId,
    });

    return {
      tokens: {
        accessToken: this.tokenService.createAccessToken(user),
        expiresInSeconds: this.tokenService.getAccessTokenExpiresInSeconds(),
        refreshToken,
        tokenType: 'Bearer',
      },
      user: {
        email: user.email,
        role: user.role,
        userId: user.userId,
      },
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
