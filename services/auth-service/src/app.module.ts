import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { AuthServiceConfigModule } from './config/auth-service-config.module';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthServiceConfigModule, PrismaModule, MessagingModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
