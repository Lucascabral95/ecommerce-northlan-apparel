import { Module } from '@nestjs/common';
import { NotificationServiceConfigModule } from './config/notification-service-config.module';
import { HealthController } from './health.controller';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [NotificationServiceConfigModule, PrismaModule, MessagingModule, NotificationModule],
  controllers: [HealthController],
})
export class AppModule {}
