import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthResponseDto } from '@northlane/contracts';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import {
  ApiAuthError,
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
  ApiValidationError,
} from '../common/swagger/api-docs.decorators';
import { authResponseSchema, errorResponseSchema } from '../common/swagger/openapi-schemas';
import { AuthGatewayService } from './auth.gateway-service';
import { LoginRequestDto, RefreshRequestDto, RegisterRequestDto } from './auth.dto';

@ApiTags('Auth')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@Controller('auth')
export class AuthController {
  constructor(private readonly authGatewayService: AuthGatewayService) {}

  @ApiOperation({ summary: 'Register a new customer account.' })
  @ApiJsonResponse(200, 'Account created and access/refresh tokens returned.', authResponseSchema)
  @ApiValidationError('Invalid registration payload.')
  @ApiConflictResponse({
    description: 'A user with this email already exists.',
    schema: errorResponseSchema,
  })
  @Post('register')
  register(@Body() body: RegisterRequestDto, @Req() request: CorrelatedRequest): Promise<AuthResponseDto> {
    return this.authGatewayService.register(body, getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Authenticate an existing user.' })
  @ApiJsonResponse(200, 'Credentials accepted and access/refresh tokens returned.', authResponseSchema)
  @ApiValidationError('Invalid login payload.')
  @ApiAuthError('Invalid email or password.')
  @Post('login')
  login(@Body() body: LoginRequestDto, @Req() request: CorrelatedRequest): Promise<AuthResponseDto> {
    return this.authGatewayService.login(body, getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Issue a new access token using a refresh token.' })
  @ApiJsonResponse(200, 'New access/refresh token pair returned.', authResponseSchema)
  @ApiValidationError('Invalid refresh payload.')
  @ApiAuthError('Invalid or expired refresh token.')
  @Post('refresh')
  refresh(@Body() body: RefreshRequestDto, @Req() request: CorrelatedRequest): Promise<AuthResponseDto> {
    return this.authGatewayService.refresh(body, getCorrelationId(request));
  }
}
