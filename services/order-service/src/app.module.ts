import { Module } from '@nestjs/common';
import { OrderServiceConfigModule } from './config/order-service-config.module';
import { HealthController } from './health.controller';
import { MessagingModule } from './messaging/messaging.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [OrderServiceConfigModule, PrismaModule, MessagingModule, OrderModule],
  controllers: [HealthController],
})
export class AppModule {}
