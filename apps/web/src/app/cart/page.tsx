import type { Metadata } from 'next';
import { ProtectedBoundary } from '../../features/auth/protected-boundary';
import { CartPageContent } from '../../features/cart/cart-page-content';

export const metadata: Metadata = {
  title: 'Bag',
};

export default function CartPage() {
  return (
    <ProtectedBoundary>
      <CartPageContent />
    </ProtectedBoundary>
  );
}
