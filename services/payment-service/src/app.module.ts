import { Module } from '@nestjs/common';
import { PaymentServiceConfigModule } from './config/payment-service-config.module';
import { HealthController } from './health.controller';
import { MessagingModule } from './messaging/messaging.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PaymentServiceConfigModule, PrismaModule, MessagingModule, PaymentModule],
  controllers: [HealthController],
})
export class AppModule {}
