import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware, ObservabilityModule } from '@northlane/shared';
import { CartModule } from './cart/cart.module';
import { CartServiceConfigModule } from './config/cart-service-config.module';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    CartServiceConfigModule,
    PrismaModule,
    MessagingModule,
    ObservabilityModule.register({ serviceName: 'cart-service' }),
    CartModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
