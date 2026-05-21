import { Global, Module } from '@nestjs/common';
import { AuthServiceConfigService } from './auth-service.config';

@Global()
@Module({
  exports: [AuthServiceConfigService],
  providers: [AuthServiceConfigService],
})
export class AuthServiceConfigModule {}
