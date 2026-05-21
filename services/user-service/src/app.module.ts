import { Module } from '@nestjs/common';
import { UserServiceConfigModule } from './config/user-service-config.module';
import { HealthController } from './health.controller';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UserServiceConfigModule, PrismaModule, MessagingModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
