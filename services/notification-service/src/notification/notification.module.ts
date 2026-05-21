import { Module } from '@nestjs/common';
import { NotificationMessageHandlerService } from './notification-message-handler.service';
import { NotificationService } from './notification.service';

@Module({
  providers: [NotificationMessageHandlerService, NotificationService],
})
export class NotificationModule {}
