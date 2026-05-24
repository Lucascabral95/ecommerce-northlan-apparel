import { localizedMetadata } from '../../../i18n/metadata';
import { ProtectedBoundary } from '../../../features/auth/protected-boundary';
import { CartPageContent } from '../../../features/cart/cart-page-content';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'cartTitle');

export default function CartPage() {
  return (
    <ProtectedBoundary>
      <CartPageContent />
    </ProtectedBoundary>
  );
}
