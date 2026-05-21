import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CartDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { AddCartItemRequestDto, UpdateCartItemRequestDto } from './cart.dto';
import { CartGatewayService } from './cart.gateway-service';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartGatewayService: CartGatewayService) {}

  @Get()
  getCart(@Req() request: AuthenticatedRequest): Promise<CartDto> {
    return this.cartGatewayService.getCart(requireUserId(request), getCorrelationId(request));
  }

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
