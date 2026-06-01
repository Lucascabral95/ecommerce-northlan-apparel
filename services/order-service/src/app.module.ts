import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware, ObservabilityModule } from '@northlane/shared';
import { OrderServiceConfigModule } from './config/order-service-config.module';
import { MessagingModule } from './messaging/messaging.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    OrderServiceConfigModule,
    PrismaModule,
    MessagingModule,
    ObservabilityModule.register({ serviceName: 'order-service' }),
    OrderModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
