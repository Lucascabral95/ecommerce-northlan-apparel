import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthResponseDto } from '@northlane/contracts';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import { AuthGatewayService } from './auth.gateway-service';
import { LoginRequestDto, RefreshRequestDto, RegisterRequestDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authGatewayService: AuthGatewayService) {}

  @Post('register')
  register(@Body() body: RegisterRequestDto, @Req() request: CorrelatedRequest): Promise<AuthResponseDto> {
    return this.authGatewayService.register(body, getCorrelationId(request));
  }

  @Post('login')
  login(@Body() body: LoginRequestDto, @Req() request: CorrelatedRequest): Promise<AuthResponseDto> {
    return this.authGatewayService.login(body, getCorrelationId(request));
  }

  @Post('refresh')
  refresh(@Body() body: RefreshRequestDto, @Req() request: CorrelatedRequest): Promise<AuthResponseDto> {
    return this.authGatewayService.refresh(body, getCorrelationId(request));
  }
}
