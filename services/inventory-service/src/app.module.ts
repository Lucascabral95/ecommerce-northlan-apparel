import { Module } from '@nestjs/common';
import { InventoryServiceConfigModule } from './config/inventory-service-config.module';
import { HealthController } from './health.controller';
import { InventoryModule } from './inventory/inventory.module';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [InventoryServiceConfigModule, PrismaModule, MessagingModule, InventoryModule],
  controllers: [HealthController],
})
export class AppModule {}
