import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware, ObservabilityModule } from '@northlane/shared';
import { InventoryServiceConfigModule } from './config/inventory-service-config.module';
import { InventoryModule } from './inventory/inventory.module';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    InventoryServiceConfigModule,
    PrismaModule,
    MessagingModule,
    ObservabilityModule.register({ serviceName: 'inventory-service' }),
    InventoryModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
