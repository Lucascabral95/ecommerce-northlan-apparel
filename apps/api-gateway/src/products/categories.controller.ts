import { Controller, Get, Req } from '@nestjs/common';
import { CategoryDto } from '@northlane/contracts';
import { CorrelatedRequest, getCorrelationId } from '@northlane/shared';
import { CatalogGatewayService } from './catalog.gateway-service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly catalogGatewayService: CatalogGatewayService) {}

  @Get()
  listCategories(@Req() request: CorrelatedRequest): Promise<readonly CategoryDto[]> {
    return this.catalogGatewayService.listCategories(getCorrelationId(request));
  }
}
