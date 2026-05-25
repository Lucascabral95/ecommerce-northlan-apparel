import { localizedMetadata } from '@/i18n/metadata';
import { PaymentReturnPageContent } from '@/features/checkout/payment-return-page-content';
import { Suspense } from 'react';

export const generateMetadata = (props: Parameters<typeof localizedMetadata>[0]) =>
  localizedMetadata(props, 'paymentPending');

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<PaymentReturnFallback />}>
      <PaymentReturnPageContent outcome="pending" />
    </Suspense>
  );
}

function PaymentReturnFallback() {
  return (
    <section className="page-shell">
      <div className="surface mx-auto min-h-80 max-w-3xl animate-pulse rounded-[2rem] p-8" />
    </section>
  );
}
