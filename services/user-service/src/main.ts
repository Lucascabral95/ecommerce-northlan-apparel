import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { JsonLogger } from '@northlane/shared';
import { AppModule } from './app.module';
import { loadUserServiceConfig } from './config/user-service.config';

async function bootstrap(): Promise<void> {
  const config = loadUserServiceConfig();
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(config.serviceName),
  });

  await app.listen(config.port);
}

void bootstrap();
