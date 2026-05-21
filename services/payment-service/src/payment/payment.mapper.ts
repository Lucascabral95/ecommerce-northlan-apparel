import { PaymentDto } from '@northlane/contracts';
import { Payment, Prisma } from '../generated/prisma';

export function mapPayment(payment: Payment): PaymentDto {
  return {
    amount: toNumber(payment.amount),
    createdAt: payment.createdAt.toISOString(),
    currency: payment.currency,
    failureReason: payment.failureReason ?? undefined,
    id: payment.id,
    idempotencyKey: payment.idempotencyKey,
    metadata: payment.metadata ?? undefined,
    orderId: payment.orderId,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId ?? undefined,
    status: payment.status,
    updatedAt: payment.updatedAt.toISOString(),
    userId: payment.userId,
  };
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}
