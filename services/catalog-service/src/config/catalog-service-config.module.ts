import { Global, Module } from '@nestjs/common';
import { CatalogServiceConfigService } from './catalog-service.config';

@Global()
@Module({
  exports: [CatalogServiceConfigService],
  providers: [CatalogServiceConfigService],
})
export class CatalogServiceConfigModule {}
