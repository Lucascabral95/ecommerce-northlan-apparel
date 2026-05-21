import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { ApiGatewayConfigService } from '../config/api-gateway-config.service';
import { AuthenticatedPrincipal, AuthenticatedRequest } from './authenticated-request';

type JwtPayload = {
  email?: unknown;
  role?: unknown;
  sub?: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ApiGatewayConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.header('authorization'));

    if (!token) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    try {
      const payload = jwt.verify(token, this.config.jwtAccessSecret) as JwtPayload;
      request.user = parsePrincipal(payload);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}

function extractBearerToken(header: string | undefined): string | undefined {
  const [scheme, token] = header?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    return undefined;
  }

  return token;
}

function parsePrincipal(payload: JwtPayload): AuthenticatedPrincipal {
  if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new UnauthorizedException('Invalid access token payload.');
  }

  if (payload.role !== 'ADMIN' && payload.role !== 'USER') {
    throw new UnauthorizedException('Invalid access token role.');
  }

  return {
    email: payload.email,
    role: payload.role,
    userId: payload.sub,
  };
}
