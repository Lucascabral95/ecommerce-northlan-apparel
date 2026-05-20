import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware } from '@northlane/shared';
import { HealthController } from './health.controller';
import { StatusController } from './status.controller';

@Module({
  controllers: [HealthController, StatusController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
