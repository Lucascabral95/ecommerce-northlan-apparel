import { NestFactory } from '@nestjs/core';
import { JsonLogger, loadServiceConfig } from '@northlane/shared';
import { AppModule } from './app.module';

const config = loadServiceConfig('api-gateway', 4000);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(config.serviceName),
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['/health', '/metrics'],
  });
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(config.port);
}

void bootstrap();
