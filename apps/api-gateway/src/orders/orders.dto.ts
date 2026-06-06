import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@northlane/contracts';

const ORDER_STATUSES = [
  'CANCELLED',
  'CONFIRMED',
  'DELIVERED',
  'FAILED',
  'PAID',
  'PAYMENT_PENDING',
  'PENDING',
  'PREPARING',
  'REFUNDED',
  'SHIPPED',
  'STOCK_RESERVED',
] as const satisfies readonly OrderStatus[];

export class CheckoutRequestDto {
  @ApiPropertyOptional({
    description: 'Billing address snapshot used for this checkout.',
    additionalProperties: true,
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  billingAddressSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Client-generated idempotency key. Can also be sent in the idempotency-key header.',
    example: 'checkout-20260605-001',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68' })
  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    description: 'Shipping address snapshot used for this checkout.',
    additionalProperties: true,
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  shippingAddressSnapshot?: Record<string, unknown>;
}

export class UpdateOrderStatusRequestDto {
  @ApiPropertyOptional({ example: 'Customer requested cancellation.' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ enum: ORDER_STATUSES, example: 'CONFIRMED' })
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;
}
