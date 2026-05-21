import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { CatalogServiceConfigModule } from './config/catalog-service-config.module';
import { HealthController } from './health.controller';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [CatalogServiceConfigModule, PrismaModule, MessagingModule, CatalogModule],
  controllers: [HealthController],
})
export class AppModule {}
