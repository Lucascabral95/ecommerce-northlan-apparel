import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InventoryItemDto, ProductDto, ProductListResponseDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import { InventoryGatewayService } from '../inventory/inventory.gateway-service';
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
  ) {}

  @Get('products')
  listProducts(
    @Query() query: ListProductsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProductListResponseDto> {
    return this.catalogGatewayService.listProducts(query, getCorrelationId(request), { includeInactive: true });
  }

  @Post('products')
  createProduct(@Body() body: CreateProductRequestDto, @Req() request: AuthenticatedRequest): Promise<ProductDto> {
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
}
