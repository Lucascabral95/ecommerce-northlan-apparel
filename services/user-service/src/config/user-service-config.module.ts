import { Global, Module } from '@nestjs/common';
import { UserServiceConfigService } from './user-service.config';

@Global()
@Module({
  exports: [UserServiceConfigService],
  providers: [UserServiceConfigService],
})
export class UserServiceConfigModule {}
