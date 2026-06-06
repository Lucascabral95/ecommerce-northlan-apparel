import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  InventoryItemDto,
  OrderDto,
  ProductDto,
  ProductListResponseDto,
} from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import {
  ApiAuthError,
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
  ApiResourceNotFound,
  ApiValidationError,
} from '../common/swagger/api-docs.decorators';
import {
  arraySchema,
  errorResponseSchema,
  inventoryItemSchema,
  orderSchema,
  productListResponseSchema,
  productSchema,
} from '../common/swagger/openapi-schemas';
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
@ApiTags('Admin')
@ApiBearerAuth('access-token')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@ApiAuthError()
@ApiForbiddenResponse({ description: 'Admin role is required.', schema: errorResponseSchema })
@Controller('admin')
export class AdminController {
  constructor(
    private readonly catalogGatewayService: CatalogGatewayService,
    private readonly inventoryGatewayService: InventoryGatewayService,
    private readonly orderGatewayService: OrderGatewayService,
  ) {}

  @ApiOperation({ summary: 'List products including inactive items.' })
  @ApiJsonResponse(200, 'Product list returned for admin management.', productListResponseSchema)
  @Get('products')
  listProducts(
    @Query() query: ListProductsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductListResponseDto> {
    return this.catalogGatewayService.listProducts(query, getCorrelationId(request), {
      includeInactive: true,
    });
  }

  @ApiOperation({ summary: 'Create a catalog product.' })
  @ApiJsonResponse(200, 'Created product returned.', productSchema)
  @ApiValidationError('Invalid product payload.')
  @Post('products')
  createProduct(
    @Body() body: CreateProductRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductDto> {
    return this.catalogGatewayService.createProduct(body, getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Update a catalog product.' })
  @ApiParam({ name: 'id', example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @ApiJsonResponse(200, 'Updated product returned.', productSchema)
  @ApiValidationError('Invalid product payload.')
  @ApiResourceNotFound('Product was not found.')
  @Patch('products/:id')
  updateProduct(
    @Body() body: UpdateProductRequestDto,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductDto> {
    return this.catalogGatewayService.updateProduct(id, body, getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Adjust inventory stock for a product variant.' })
  @ApiParam({ name: 'id', description: 'Product id.', example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @ApiJsonResponse(200, 'Updated inventory item returned.', inventoryItemSchema)
  @ApiValidationError('Invalid stock adjustment payload.')
  @ApiResourceNotFound('Product variant or inventory item was not found.')
  @Patch('products/:id/stock')
  adjustProductStock(
    @Body() body: AdjustProductStockRequestDto,
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<InventoryItemDto> {
    return this.inventoryGatewayService.adjustProductStock(id, body, getCorrelationId(request));
  }

  @ApiOperation({ summary: 'List all customer orders.' })
  @ApiJsonResponse(200, 'All orders returned for admin management.', arraySchema(orderSchema))
  @Get('orders')
  listOrders(@Req() request: AuthenticatedRequest): Promise<readonly OrderDto[]> {
    return this.orderGatewayService.listOrders({ includeAll: true }, getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Update an order status manually.' })
  @ApiParam({ name: 'id', example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @ApiJsonResponse(200, 'Updated order returned.', orderSchema)
  @ApiValidationError('Invalid order status payload.')
  @ApiResourceNotFound('Order was not found.')
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
