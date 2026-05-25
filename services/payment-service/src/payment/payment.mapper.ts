import { PaymentDto } from '@northlane/contracts';
import { Payment, Prisma } from '../generated/prisma';

export function mapPayment(payment: Payment): PaymentDto {
  return {
    amount: toNumber(payment.amount),
    checkoutUrl: payment.checkoutUrl ?? undefined,
    createdAt: payment.createdAt.toISOString(),
    currency: payment.currency,
    externalReference: payment.externalReference ?? undefined,
    failureReason: payment.failureReason ?? undefined,
    id: payment.id,
    idempotencyKey: payment.idempotencyKey,
    initPoint: payment.initPoint ?? undefined,
    metadata: payment.metadata ?? undefined,
    orderId: payment.orderId,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId ?? undefined,
    providerPreferenceId: payment.providerPreferenceId ?? undefined,
    rawProviderStatus: payment.rawProviderStatus ?? undefined,
    sandboxInitPoint: payment.sandboxInitPoint ?? undefined,
    status: payment.status,
    updatedAt: payment.updatedAt.toISOString(),
    userId: payment.userId,
  };
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}
