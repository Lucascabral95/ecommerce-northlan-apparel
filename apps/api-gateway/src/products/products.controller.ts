import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ProductDto, ProductListResponseDto } from '@northlane/contracts';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import {
  ApiGatewayErrors,
  ApiGatewayHeaders,
  ApiJsonResponse,
  ApiResourceNotFound,
} from '../common/swagger/api-docs.decorators';
import { productListResponseSchema, productSchema } from '../common/swagger/openapi-schemas';
import { CatalogGatewayService } from './catalog.gateway-service';
import { ListProductsQueryDto } from './products.dto';

@ApiTags('Products')
@ApiGatewayHeaders()
@ApiGatewayErrors()
@Controller('products')
export class ProductsController {
  constructor(private readonly catalogGatewayService: CatalogGatewayService) {}

  @ApiOperation({ summary: 'List active catalog products.' })
  @ApiJsonResponse(200, 'Paginated product list with available filters.', productListResponseSchema)
  @Get()
  listProducts(
    @Query() query: ListProductsQueryDto,
    @Req() request: CorrelatedRequest,
  ): Promise<ProductListResponseDto> {
    return this.catalogGatewayService.listProducts(query, getCorrelationId(request));
  }

  @ApiOperation({ summary: 'Get a product by slug.' })
  @ApiParam({ name: 'slug', example: 'sobretodo_liso_negro' })
  @ApiJsonResponse(200, 'Product detail returned.', productSchema)
  @ApiResourceNotFound('Product was not found.')
  @Get(':slug')
  getProduct(@Param('slug') slug: string, @Req() request: CorrelatedRequest): Promise<ProductDto> {
    return this.catalogGatewayService.getProductBySlug(slug, getCorrelationId(request));
  }
}
