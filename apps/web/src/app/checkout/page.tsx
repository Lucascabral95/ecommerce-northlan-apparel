import type { Metadata } from 'next';
import { ProtectedBoundary } from '../../features/auth/protected-boundary';
import { CheckoutPageContent } from '../../features/checkout/checkout-page-content';

export const metadata: Metadata = {
  title: 'Checkout',
};

export default function CheckoutPage() {
  return (
    <ProtectedBoundary>
      <CheckoutPageContent />
    </ProtectedBoundary>
  );
}
