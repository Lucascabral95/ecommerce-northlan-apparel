import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { JsonLogger } from '@northlane/shared';
import { AppModule } from './app.module';
import {
  NotificationServiceConfigService,
  loadNotificationServiceConfig,
} from './config/notification-service.config';

const bootstrapConfig = loadNotificationServiceConfig();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(bootstrapConfig.serviceName),
  });

  const config = app.get(NotificationServiceConfigService);
  await app.listen(config.port);
}

void bootstrap();
