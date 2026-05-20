import { Global, Module } from '@nestjs/common';
import { ApiGatewayConfigService } from './api-gateway-config.service';

@Global()
@Module({
  exports: [ApiGatewayConfigService],
  providers: [ApiGatewayConfigService],
})
export class GatewayConfigModule {}
