import { describe, expect, it } from 'vitest';
import {
  acceptedCommandSchema,
  addressSchema,
  authResponseSchema,
  categorySchema,
  cartSchema,
  checkoutSessionSchema,
  correlationIdHeader,
  errorResponseSchema,
  inventoryItemSchema,
  orderSchema,
  productListResponseSchema,
  productSchema,
  userProfileSchema,
} from './openapi-schemas';

describe('API Gateway OpenAPI schemas', () => {
  it('defines professional response schemas for critical API domains', () => {
    expect(correlationIdHeader.name).toBe('x-correlation-id');
    expect(errorResponseSchema.properties).toHaveProperty('correlationId');
    expect(errorResponseSchema.properties).toHaveProperty('statusCode');

    expect(authResponseSchema.properties).toHaveProperty('tokens');
    expect(authResponseSchema.properties).toHaveProperty('user');

    expect(productSchema.properties).toHaveProperty('variants');
    expect(productSchema.properties).toHaveProperty('images');
    expect(productListResponseSchema.properties).toHaveProperty('filters');
    expect(productListResponseSchema.properties.filters.properties.categories.items).toBe(categorySchema);

    expect(cartSchema.properties).toHaveProperty('items');
    expect(orderSchema.properties).toHaveProperty('statusHistory');
    expect(orderSchema.properties.statusHistory.items.properties).toHaveProperty('status');
    expect(checkoutSessionSchema.properties).toHaveProperty('checkoutUrl');
    expect(checkoutSessionSchema.properties).toHaveProperty('paymentProvider');
    expect(checkoutSessionSchema.properties.payment).toBeDefined();

    expect(userProfileSchema.example).toHaveProperty('email');
    expect(addressSchema.example).toHaveProperty('recipientName');
    expect(inventoryItemSchema.example).toHaveProperty('sku');
    expect(acceptedCommandSchema.required).toContain('accepted');
  });
});
