'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAddToCart } from './cart-hooks';
import { useCartUiStore } from './cart-store';
import { Button } from '../../shared/ui/button';
import { useAuthStore } from '../auth/auth-store';
import { useToastStore } from '../../shared/ui/toast';

export function AddToCartButton({
  available,
  productId,
  variantId,
}: Readonly<{
  available: boolean;
  productId: string;
  variantId?: string;
}>) {
  const t = useTranslations('products.detail');
  const addToCart = useAddToCart();
  const openDrawer = useCartUiStore((state) => state.openDrawer);
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const router = useRouter();

  return (
    <Button
      className="w-full cursor-pointer"
      disabled={!available || !variantId || addToCart.isPending}
      onClick={() => {
        if (!user) {
          pushToast('Sign in before building your bag.', 'error');
          router.push('/login');
          return;
        }

        if (!variantId) {
          return;
        }

        addToCart.mutate(
          { productId, quantity: 1, variantId },
          {
            onSuccess: openDrawer,
          },
        );
      }}
      type="button"
    >
      {available ? (addToCart.isPending ? 'Adding' : t('addToBag')) : t('soldOut')}
    </Button>
  );
}
