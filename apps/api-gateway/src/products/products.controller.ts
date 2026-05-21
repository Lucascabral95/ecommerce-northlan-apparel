import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ProductDto, ProductListResponseDto } from '@northlane/contracts';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import { CatalogGatewayService } from './catalog.gateway-service';
import { ListProductsQueryDto } from './products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly catalogGatewayService: CatalogGatewayService) {}

  @Get()
  listProducts(
    @Query() query: ListProductsQueryDto,
    @Req() request: CorrelatedRequest,
  ): Promise<ProductListResponseDto> {
    return this.catalogGatewayService.listProducts(query, getCorrelationId(request));
  }

  @Get(':slug')
  getProduct(@Param('slug') slug: string, @Req() request: CorrelatedRequest): Promise<ProductDto> {
    return this.catalogGatewayService.getProductBySlug(slug, getCorrelationId(request));
  }
}
