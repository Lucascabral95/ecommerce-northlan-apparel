export type AuthRole = 'ADMIN' | 'USER';

export type StoredUserCredential = Readonly<{
  createdAt: Date;
  email: string;
  passwordHash: string;
  role: AuthRole;
  userId: string;
}>;

export type StoredRefreshToken = Readonly<{
  expiresAt: Date;
  id: string;
  revokedAt: Date | null;
  tokenHash: string;
  userId: string;
}>;

export type RegisterInput = Readonly<{
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
}>;

export type LoginInput = Readonly<{
  email: string;
  password: string;
}>;

export type AuthSession = Readonly<{
  tokens: Readonly<{
    accessToken: string;
    expiresInSeconds: number;
    refreshToken: string;
    tokenType: 'Bearer';
  }>;
  user: Readonly<{
    email: string;
    role: AuthRole;
    userId: string;
  }>;
}>;
