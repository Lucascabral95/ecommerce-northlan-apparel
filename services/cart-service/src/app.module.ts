import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { CartServiceConfigModule } from './config/cart-service-config.module';
import { HealthController } from './health.controller';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [CartServiceConfigModule, PrismaModule, MessagingModule, CartModule],
  controllers: [HealthController],
})
export class AppModule {}
