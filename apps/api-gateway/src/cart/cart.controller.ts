import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CartDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import {
  ApiAuthError,
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
  ApiResourceNotFound,
} from '../common/swagger/api-docs.decorators';
import { cartSchema } from '../common/swagger/openapi-schemas';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { AddCartItemRequestDto, UpdateCartItemRequestDto } from './cart.dto';
import { CartGatewayService } from './cart.gateway-service';

@UseGuards(JwtAuthGuard)
@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@ApiAuthError()
@Controller('cart')
export class CartController {
  constructor(private readonly cartGatewayService: CartGatewayService) {}

  @ApiOperation({ summary: 'Get the authenticated user active cart.' })
  @ApiJsonResponse(200, 'Current active cart returned.', cartSchema)
  @Get()
  getCart(@Req() request: AuthenticatedRequest): Promise<CartDto> {
    return this.cartGatewayService.getCart(requireUserId(request), getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Add an item to the authenticated user cart.' })
  @ApiJsonResponse(200, 'Updated cart returned.', cartSchema)
  @ApiResourceNotFound('Product or variant was not found.')
  @Post('items')
  addItem(@Body() body: AddCartItemRequestDto, @Req() request: AuthenticatedRequest): Promise<CartDto> {
    return this.cartGatewayService.addItem(
      {
        ...body,
        userId: requireUserId(request),
      },
      getCorrelationId(request),
    );
  }

  @ApiOperation({ summary: 'Update a cart item quantity.' })
  @ApiParam({ name: 'itemId', example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @ApiJsonResponse(200, 'Updated cart returned.', cartSchema)
  @ApiResourceNotFound('Cart item was not found.')
  @Patch('items/:itemId')
  updateItem(
    @Body() body: UpdateCartItemRequestDto,
    @Param('itemId') itemId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CartDto> {
    return this.cartGatewayService.updateItem(
      {
        itemId,
        quantity: body.quantity,
        userId: requireUserId(request),
      },
      getCorrelationId(request),
    );
  }

  @ApiOperation({ summary: 'Remove an item from the authenticated user cart.' })
  @ApiParam({ name: 'itemId', example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @ApiJsonResponse(200, 'Updated cart returned.', cartSchema)
  @ApiResourceNotFound('Cart item was not found.')
  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string, @Req() request: AuthenticatedRequest): Promise<CartDto> {
    return this.cartGatewayService.removeItem(
      {
        itemId,
        userId: requireUserId(request),
      },
      getCorrelationId(request),
    );
  }

  @ApiOperation({ summary: 'Clear all items from the authenticated user cart.' })
  @ApiJsonResponse(200, 'Empty cart returned.', cartSchema)
  @Delete()
  clearCart(@Req() request: AuthenticatedRequest): Promise<CartDto> {
    return this.cartGatewayService.clearCart(requireUserId(request), getCorrelationId(request));
  }
}

function requireUserId(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new Error('Authenticated request is missing user context.');
  }

  return request.user.userId;
}
