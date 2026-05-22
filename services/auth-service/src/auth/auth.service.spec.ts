import { describe, expect, it } from 'vitest';
import { AuthRepository, CreateRefreshTokenInput, CreateUserCredentialInput } from './auth.repository';
import { AuthService } from './auth.service';
import { StoredRefreshToken, StoredUserCredential } from './auth.types';
import { randomUUID } from 'node:crypto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UserRegisteredPublisher } from './user-registered.publisher';

class InMemoryAuthRepository implements AuthRepository {
  readonly refreshTokens = new Map<string, StoredRefreshToken>();
  readonly users = new Map<string, StoredUserCredential>();

  async createUserCredential(input: CreateUserCredentialInput): Promise<StoredUserCredential> {
    const user: StoredUserCredential = {
      createdAt: new Date(),
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      userId: input.userId,
    };

    this.users.set(user.email, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<StoredUserCredential | null> {
    return this.users.get(email) ?? null;
  }

  async findUserByUserId(userId: string): Promise<StoredUserCredential | null> {
    return [...this.users.values()].find((user) => user.userId === userId) ?? null;
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<StoredRefreshToken> {
    const token: StoredRefreshToken = {
      expiresAt: input.expiresAt,
      id: randomUUID(),
      revokedAt: null,
      tokenHash: input.tokenHash,
      userId: input.userId,
    };

    this.refreshTokens.set(token.tokenHash, token);
    return token;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.refreshTokens.get(tokenHash) ?? null;
  }

  async revokeRefreshToken(tokenHash: string, revokedAt: Date): Promise<void> {
    const token = this.refreshTokens.get(tokenHash);
    if (!token) {
      return;
    }

    this.refreshTokens.set(tokenHash, {
      ...token,
      revokedAt,
    });
  }
}

describe('AuthService', () => {
  it('registers a user, stores bcrypt hash and publishes user registered event', async () => {
    const repository = new InMemoryAuthRepository();
    const publishedEvents: unknown[] = [];
    const service = createAuthService(repository, publishedEvents);

    const session = await service.register(
      {
        email: 'USER@northlane.test',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'SecurePassword123!',
      },
      'test-correlation',
    );

    const user = await repository.findUserByEmail('user@northlane.test');

    expect(session.tokens.accessToken).toBeTruthy();
    expect(session.tokens.refreshToken).toBeTruthy();
    expect(session.user.email).toBe('user@northlane.test');
    expect(user?.passwordHash).toBe('hashed:SecurePassword123!');
    expect(publishedEvents).toHaveLength(1);
  });

  it('rejects login with invalid password', async () => {
    const repository = new InMemoryAuthRepository();
    const service = createAuthService(repository, []);

    await repository.createUserCredential({
      email: 'user@northlane.test',
      passwordHash: 'hashed:correct-password',
      role: 'USER',
      userId: randomUUID(),
    });

    await expect(
      service.login({
        email: 'user@northlane.test',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('logs in a registered user and issues a new refresh token', async () => {
    const repository = new InMemoryAuthRepository();
    const service = createAuthService(repository, []);

    await repository.createUserCredential({
      email: 'buyer@northlane.test',
      passwordHash: 'hashed:correct-password',
      role: 'USER',
      userId: 'buyer-1',
    });

    const session = await service.login({
      email: 'BUYER@northlane.test',
      password: 'correct-password',
    });

    expect(session.user).toEqual({
      email: 'buyer@northlane.test',
      role: 'USER',
      userId: 'buyer-1',
    });
    expect(session.tokens.accessToken).toBe('access:buyer-1');
    expect(repository.refreshTokens).toHaveProperty('size', 1);
  });
});

function createAuthService(repository: AuthRepository, publishedEvents: unknown[]): AuthService {
  const passwordService = {
    hashPassword: (password: string) => Promise.resolve(`hashed:${password}`),
    verifyPassword: (password: string, hash: string) => Promise.resolve(hash === `hashed:${password}`),
  };
  const tokenService = {
    createAccessToken: (user: StoredUserCredential) => `access:${user.userId}`,
    createRefreshToken: () => 'refresh-token',
    getAccessTokenExpiresInSeconds: () => 900,
    getRefreshTokenExpiresAt: () => new Date(Date.now() + 86_400_000),
    hashRefreshToken: (refreshToken: string) => `hash:${refreshToken}`,
  };
  const publisher = {
    publish: (...args: unknown[]) => {
      publishedEvents.push(args);
      return Promise.resolve();
    },
  };

  return new AuthService(
    repository,
    passwordService as unknown as PasswordService,
    tokenService as unknown as TokenService,
    publisher as unknown as UserRegisteredPublisher,
  );
}
