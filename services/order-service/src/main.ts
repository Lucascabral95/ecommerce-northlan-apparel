import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { JsonLogger } from '@northlane/shared';
import { AppModule } from './app.module';
import { OrderServiceConfigService, loadOrderServiceConfig } from './config/order-service.config';

const bootstrapConfig = loadOrderServiceConfig();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(bootstrapConfig.serviceName),
  });

  const config = app.get(OrderServiceConfigService);
  await app.listen(config.port);
}

void bootstrap();
