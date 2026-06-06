import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AddressDto, UserProfileDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import {
  ApiAuthError,
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
  ApiValidationError,
} from '../common/swagger/api-docs.decorators';
import { addressSchema, arraySchema, userProfileSchema } from '../common/swagger/openapi-schemas';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CreateAddressRequestDto, UpdateProfileRequestDto } from './me.dto';
import { MeGatewayService } from './me.gateway-service';

@UseGuards(JwtAuthGuard)
@ApiTags('Account')
@ApiBearerAuth('access-token')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@ApiAuthError()
@Controller('me')
export class MeController {
  constructor(private readonly meGatewayService: MeGatewayService) {}

  @ApiOperation({ summary: 'Get the authenticated user profile.' })
  @ApiJsonResponse(200, 'User profile returned.', userProfileSchema)
  @Get()
  getProfile(@Req() request: AuthenticatedRequest): Promise<UserProfileDto> {
    return this.meGatewayService.getProfile(requireUserId(request), getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Update the authenticated user profile.' })
  @ApiJsonResponse(200, 'Updated profile returned.', userProfileSchema)
  @ApiValidationError('Invalid profile payload.')
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

  @ApiOperation({ summary: 'List authenticated user addresses.' })
  @ApiJsonResponse(200, 'Address list returned.', arraySchema(addressSchema))
  @Get('addresses')
  listAddresses(@Req() request: AuthenticatedRequest): Promise<readonly AddressDto[]> {
    return this.meGatewayService.listAddresses(requireUserId(request), getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Create an address for the authenticated user.' })
  @ApiJsonResponse(200, 'Created address returned.', addressSchema)
  @ApiValidationError('Invalid address payload.')
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
