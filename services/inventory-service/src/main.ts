import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { JsonLogger } from '@northlane/shared';
import { AppModule } from './app.module';
import { InventoryServiceConfigService, loadInventoryServiceConfig } from './config/inventory-service.config';

const bootstrapConfig = loadInventoryServiceConfig();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(bootstrapConfig.serviceName),
  });

  const config = app.get(InventoryServiceConfigService);
  await app.listen(config.port);
}

void bootstrap();
