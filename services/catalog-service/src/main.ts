import { NestFactory } from '@nestjs/core';
import { JsonLogger, loadServiceConfig } from '@northlane/shared';
import { AppModule } from './app.module';

const config = loadServiceConfig('catalog-service', 4103);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(config.serviceName),
  });

  await app.listen(config.port);
}

void bootstrap();
