import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AddressDto, UserProfileDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CreateAddressRequestDto, UpdateProfileRequestDto } from './me.dto';
import { MeGatewayService } from './me.gateway-service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly meGatewayService: MeGatewayService) {}

  @Get()
  getProfile(@Req() request: AuthenticatedRequest): Promise<UserProfileDto> {
    return this.meGatewayService.getProfile(requireUserId(request), getCorrelationId(request));
  }

  @Patch('profile')
  updateProfile(@Body() body: UpdateProfileRequestDto, @Req() request: AuthenticatedRequest): Promise<UserProfileDto> {
    return this.meGatewayService.updateProfile(
      {
        ...body,
        userId: requireUserId(request),
      },
      getCorrelationId(request),
    );
  }

  @Get('addresses')
  listAddresses(@Req() request: AuthenticatedRequest): Promise<readonly AddressDto[]> {
    return this.meGatewayService.listAddresses(requireUserId(request), getCorrelationId(request));
  }

  @Post('addresses')
  createAddress(@Body() body: CreateAddressRequestDto, @Req() request: AuthenticatedRequest): Promise<AddressDto> {
    return this.meGatewayService.createAddress(
      {
        ...body,
        userId: requireUserId(request),
      },
      getCorrelationId(request),
    );
  }
}

function requireUserId(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new Error('Authenticated request is missing user context.');
  }

  return request.user.userId;
}
