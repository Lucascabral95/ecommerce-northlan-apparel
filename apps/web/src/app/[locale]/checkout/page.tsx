import { localizedMetadata } from '../../../i18n/metadata';
import { ProtectedBoundary } from '../../../features/auth/protected-boundary';
import { CheckoutPageContent } from '../../../features/checkout/checkout-page-content';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'checkoutTitle');

export default function CheckoutPage() {
  return (
    <ProtectedBoundary>
      <CheckoutPageContent />
    </ProtectedBoundary>
  );
}
