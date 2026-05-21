import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  InventoryItemDto,
  OrderDto,
  ProductDto,
  ProductListResponseDto,
} from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import { InventoryGatewayService } from '../inventory/inventory.gateway-service';
import { OrderGatewayService } from '../orders/order.gateway-service';
import { UpdateOrderStatusRequestDto } from '../orders/orders.dto';
import { CatalogGatewayService } from '../products/catalog.gateway-service';
import {
  AdjustProductStockRequestDto,
  CreateProductRequestDto,
  ListProductsQueryDto,
  UpdateProductRequestDto,
} from '../products/products.dto';
import { AdminGuard } from '../security/admin.guard';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly catalogGatewayService: CatalogGatewayService,
    private readonly inventoryGatewayService: InventoryGatewayService,
    private readonly orderGatewayService: OrderGatewayService,
  ) {}

  @Get('products')
  listProducts(
    @Query() query: ListProductsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductListResponseDto> {
    return this.catalogGatewayService.listProducts(query, getCorrelationId(request), {
      includeInactive: true,
    });
  }

  @Post('products')
  createProduct(
    @Body() body: CreateProductRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductDto> {
    return this.catalogGatewayService.createProduct(body, getCorrelationId(request));
  }

  @Patch('products/:id')
  updateProduct(
    @Body() body: UpdateProductRequestDto,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductDto> {
    return this.catalogGatewayService.updateProduct(id, body, getCorrelationId(request));
  }

  @Patch('products/:id/stock')
  adjustProductStock(
    @Body() body: AdjustProductStockRequestDto,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<InventoryItemDto> {
    return this.inventoryGatewayService.adjustProductStock(id, body, getCorrelationId(request));
  }

  @Get('orders')
  listOrders(@Req() request: AuthenticatedRequest): Promise<readonly OrderDto[]> {
    return this.orderGatewayService.listOrders({ includeAll: true }, getCorrelationId(request));
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Body() body: UpdateOrderStatusRequestDto,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<OrderDto> {
    return this.orderGatewayService.updateStatus(
      {
        changedBy: request.user?.userId,
        orderId: id,
        reason: body.reason,
        status: body.status,
      },
      getCorrelationId(request),
    );
  }
}
