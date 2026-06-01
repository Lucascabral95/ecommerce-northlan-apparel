import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware, ObservabilityModule } from '@northlane/shared';
import { AuthModule } from './auth/auth.module';
import { AuthServiceConfigModule } from './config/auth-service-config.module';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AuthServiceConfigModule,
    PrismaModule,
    MessagingModule,
    ObservabilityModule.register({ serviceName: 'auth-service' }),
    AuthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
