import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { JsonLogger } from '@northlane/shared';
import { AppModule } from './app.module';
import { CartServiceConfigService, loadCartServiceConfig } from './config/cart-service.config';

const bootstrapConfig = loadCartServiceConfig();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(bootstrapConfig.serviceName),
  });

  const config = app.get(CartServiceConfigService);
  await app.listen(config.port);
}

void bootstrap();
