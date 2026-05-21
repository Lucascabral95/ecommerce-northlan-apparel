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
  @IsOptional()
  @IsObject()
  billingAddressSnapshot?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @IsOptional()
  @IsObject()
  shippingAddressSnapshot?: Record<string, unknown>;
}

export class UpdateOrderStatusRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;
}
