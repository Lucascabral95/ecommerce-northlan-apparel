import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProductDto, ProductListResponseDto } from '@northlane/contracts';
import { getCorrelationId } from '@northlane/shared';
import { CatalogGatewayService } from '../products/catalog.gateway-service';
import { CreateProductRequestDto, ListProductsQueryDto, UpdateProductRequestDto } from '../products/products.dto';
import { AdminGuard } from '../security/admin.guard';
import { AuthenticatedRequest } from '../security/authenticated-request';
import { JwtAuthGuard } from '../security/jwt-auth.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly catalogGatewayService: CatalogGatewayService) {}

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
}
