import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CorrelationIdMiddleware } from '@northlane/shared';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CommonModule } from './common/common.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { ApiGatewayConfigService } from './config/api-gateway-config.service';
import { GatewayConfigModule } from './config/gateway-config.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { MessagingModule } from './messaging/messaging.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    GatewayConfigModule,
    CommonModule,
    MessagingModule,
    ThrottlerModule.forRootAsync({
      imports: [GatewayConfigModule],
      inject: [ApiGatewayConfigService],
      useFactory: (config: ApiGatewayConfigService) => [
        {
          limit: config.rateLimit.limit,
          ttl: config.rateLimit.ttlMs,
        },
      ],
    }),
    HealthModule,
    AuthModule,
    MeModule,
    ProductsModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
