import { PaymentStatus } from '@northlane/contracts';

export function mapMercadoPagoStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'cancelled':
    case 'canceled':
      return 'CANCELLED';
    case 'expired':
      return 'EXPIRED';
    case 'in_mediation':
    case 'in_process':
      return 'IN_PROCESS';
    case 'pending':
      return 'PENDING';
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED';
    case 'rejected':
      return 'REJECTED';
    default:
      return 'PENDING';
  }
}

export function isFailurePaymentStatus(status: PaymentStatus): boolean {
  return status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED';
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return (
    status === 'APPROVED' ||
    status === 'CANCELLED' ||
    status === 'EXPIRED' ||
    status === 'REFUNDED' ||
    status === 'REJECTED'
  );
}
