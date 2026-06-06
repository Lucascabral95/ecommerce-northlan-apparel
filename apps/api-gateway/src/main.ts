import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JsonLogger } from '@northlane/shared';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './common/swagger/setup-swagger';
import { ApiGatewayConfigService, loadApiGatewayConfig } from './config/api-gateway-config.service';

const bootstrapConfig = loadApiGatewayConfig();
const logger = new JsonLogger(bootstrapConfig.serviceName);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const config = app.get(ApiGatewayConfigService);

  app.setGlobalPrefix('api/v1');
  setupSwagger(app);
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  await app.listen(config.port);
  logger.log(`API Gateway listening on port ${config.port}`, 'Bootstrap');
}

void bootstrap();
