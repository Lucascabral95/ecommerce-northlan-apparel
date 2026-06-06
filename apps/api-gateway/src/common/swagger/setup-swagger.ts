import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const document = createSwaggerDocument(app);

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
    },
  });
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Northlane Apparel API Gateway')
    .setDescription(
      'Public HTTP API for Northlane Apparel. External clients must use the API Gateway. Internal microservices communicate through RabbitMQ and are intentionally not documented as public HTTP contracts here.',
    )
    .setVersion('0.1.0')
    .addServer('http://localhost:4000/api/v1', 'Local development')
    .addServer('https://api.northlane.example/api/v1', 'Production example')
    .addBearerAuth(
      {
        bearerFormat: 'JWT',
        description: 'JWT access token returned by /api/v1/auth/login or /api/v1/auth/register.',
        scheme: 'bearer',
        type: 'http',
      },
      'access-token',
    )
    .addTag('Health', 'Gateway health and runtime checks.')
    .addTag('Auth', 'Registration, login and token refresh.')
    .addTag('Products', 'Public catalog browsing.')
    .addTag('Cart', 'Authenticated cart operations.')
    .addTag('Checkout', 'Authenticated checkout orchestration.')
    .addTag('Orders', 'Authenticated customer order history.')
    .addTag('Account', 'Authenticated profile and address management.')
    .addTag('Payments', 'Payment status synchronization and Mercado Pago webhook entrypoint.')
    .addTag('Admin', 'Admin-only catalog, inventory and order operations.')
    .build();

  return SwaggerModule.createDocument(app, config);
}
