'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAddresses } from '../account/account-hooks';
import { useCart } from '../cart/cart-hooks';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { CheckoutSummary } from './checkout-summary';
import { useCheckout } from './checkout-hook';

export function CheckoutPageContent() {
  const cart = useCart();
  const addresses = useAddresses();
  const checkout = useCheckout();
  const router = useRouter();
  const [addressId, setAddressId] = useState<string>();

  if (cart.error) {
    return (
      <section className="page-shell">
        <ErrorState message={cart.error.message} />
      </section>
    );
  }

  if (cart.data && cart.data.items.length === 0) {
    return (
      <section className="page-shell">
        <EmptyState
          description="Checkout starts from the active bag snapshot."
          title="The bag is empty."
        />
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="mb-8">
        <p className="eyebrow">Checkout</p>
        <h1 className="display-title mt-4 text-6xl md:text-8xl">Reserve the order</h1>
      </div>
      {addresses.error ? <ErrorState message={addresses.error.message} /> : null}
      {cart.data ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_25rem]">
          <section className="surface rounded-[2rem] p-6">
            <p className="eyebrow">Shipping address</p>
            <div className="mt-5 grid gap-3">
              {addresses.data?.map((address) => (
                <label
                  className={`rounded-[1.4rem] border p-4 transition ${
                    addressId === address.id || (!addressId && address.isDefault)
                      ? 'border-[var(--ink)] bg-white/65'
                      : 'border-[var(--line)] bg-white/28'
                  }`}
                  key={address.id}
                >
                  <span className="flex gap-3">
                    <input
                      checked={addressId === address.id || (!addressId && address.isDefault)}
                      name="address"
                      onChange={() => setAddressId(address.id)}
                      type="radio"
                    />
                    <span>
                      <strong>{address.alias}</strong> / {address.recipientName}
                      <span className="mt-1 block text-sm text-[var(--muted)]">
                        {address.street} {address.streetNumber}, {address.city}, {address.province}
                      </span>
                    </span>
                  </span>
                </label>
              ))}
              {addresses.data?.length === 0 ? (
                <p className="rounded-[1.4rem] border border-[var(--line)] p-4 text-[var(--muted)]">
                  No stored address yet. The order can be created now and address data can be added
                  in your account.
                </p>
              ) : null}
            </div>
            <Button
              className="mt-6"
              disabled={checkout.isPending}
              onClick={() => {
                const defaultAddress = addresses.data?.find((address) => address.isDefault);
                checkout.mutate(
                  {
                    idempotencyKey: crypto.randomUUID(),
                    shippingAddressId: addressId ?? defaultAddress?.id,
                  },
                  {
                    onSuccess: (order) => router.push(`/account/orders/${order.id}`),
                  },
                );
              }}
              type="button"
            >
              {checkout.isPending ? 'Creating order' : 'Place order'}
            </Button>
          </section>
          <CheckoutSummary cart={cart.data} />
        </div>
      ) : null}
    </section>
  );
}
