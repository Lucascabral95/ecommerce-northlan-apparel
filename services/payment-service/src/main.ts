import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { JsonLogger } from '@northlane/shared';
import { AppModule } from './app.module';
import {
  PaymentServiceConfigService,
  loadPaymentServiceConfig,
} from './config/payment-service.config';

const bootstrapConfig = loadPaymentServiceConfig();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(bootstrapConfig.serviceName),
  });

  const config = app.get(PaymentServiceConfigService);
  await app.listen(config.port);
}

void bootstrap();
