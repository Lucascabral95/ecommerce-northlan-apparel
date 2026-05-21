import { Global, Module } from '@nestjs/common';
import { NotificationServiceConfigService } from './notification-service.config';

@Global()
@Module({
  exports: [NotificationServiceConfigService],
  providers: [NotificationServiceConfigService],
})
export class NotificationServiceConfigModule {}
