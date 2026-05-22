import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

const JWT_SECRET = 'phase-15-test-access-secret';

describe('API Gateway security guards', () => {
  it('parses authenticated principals from bearer access tokens', () => {
    const request = createRequest({
      authorization: `Bearer ${jwt.sign(
        {
          email: 'admin@northlane.test',
          role: 'ADMIN',
          sub: 'admin-1',
        },
        JWT_SECRET,
      )}`,
    });
    const guard = new JwtAuthGuard({ jwtAccessSecret: JWT_SECRET } as never);

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.user).toEqual({
      email: 'admin@northlane.test',
      role: 'ADMIN',
      userId: 'admin-1',
    });
  });

  it('rejects missing bearer tokens', () => {
    const guard = new JwtAuthGuard({ jwtAccessSecret: JWT_SECRET } as never);

    expect(() => guard.canActivate(createContext(createRequest({})))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows only admin principals on admin endpoints', () => {
    const guard = new AdminGuard();

    expect(
      guard.canActivate(
        createContext(createRequest({}, { email: 'admin@test', role: 'ADMIN', userId: 'admin-1' })),
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        createContext(createRequest({}, { email: 'buyer@test', role: 'USER', userId: 'user-1' })),
      ),
    ).toThrow(ForbiddenException);
  });
});

function createRequest(
  headers: Record<string, string>,
  user?: { email: string; role: 'ADMIN' | 'USER'; userId: string },
) {
  return {
    header: (name: string) => headers[name],
    user,
  };
}

function createContext(request: ReturnType<typeof createRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
