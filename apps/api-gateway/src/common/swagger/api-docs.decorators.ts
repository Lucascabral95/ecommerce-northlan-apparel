import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { correlationIdHeader, errorResponseSchema } from './openapi-schemas';

export function ApiGatewayHeaders() {
  return applyDecorators(ApiHeader(correlationIdHeader));
}

export function ApiGatewayErrors() {
  return applyDecorators(
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded.',
      schema: errorResponseSchema,
    }),
    ApiInternalServerErrorResponse({
      description: 'Unexpected gateway or upstream service error.',
      schema: errorResponseSchema,
    }),
  );
}

export function ApiValidationError(description = 'Invalid request payload or parameters.') {
  return applyDecorators(
    ApiBadRequestResponse({
      description,
      schema: errorResponseSchema,
    }),
  );
}

export function ApiAuthError(description = 'Missing, invalid or expired access token.') {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description,
      schema: errorResponseSchema,
    }),
  );
}

export function ApiResourceNotFound(description = 'Resource was not found.') {
  return applyDecorators(
    ApiNotFoundResponse({
      description,
      schema: errorResponseSchema,
    }),
  );
}

export function ApiJsonResponse(status: number, description: string, schema: object) {
  return applyDecorators(
    ApiResponse({
      description,
      schema,
      status,
    }),
  );
}
