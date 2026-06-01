import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware, ObservabilityModule } from '@northlane/shared';
import { CatalogModule } from './catalog/catalog.module';
import { CatalogServiceConfigModule } from './config/catalog-service-config.module';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    CatalogServiceConfigModule,
    PrismaModule,
    MessagingModule,
    ObservabilityModule.register({ serviceName: 'catalog-service' }),
    CatalogModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
