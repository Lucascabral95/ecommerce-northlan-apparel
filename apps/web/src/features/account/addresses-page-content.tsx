'use client';

import { ErrorState } from '../../shared/ui/states';
import { AddressForm } from './address-form';
import { useAddresses } from './account-hooks';

export function AddressesPageContent() {
  const addresses = useAddresses();

  return (
    <div>
      <p className="eyebrow">Addresses</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">Delivery stops</h1>
      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_1.1fr]">
        <section className="grid h-fit gap-3">
          {addresses.error ? <ErrorState message={addresses.error.message} /> : null}
          {addresses.data?.map((address) => (
            <article className="surface rounded-[1.6rem] p-5" key={address.id}>
              <div className="flex justify-between gap-3">
                <p className="text-lg font-semibold">{address.alias}</p>
                {address.isDefault ? <span className="eyebrow">Default</span> : null}
              </div>
              <p className="mt-3">{address.recipientName}</p>
              <p className="mt-1 text-[var(--muted)]">
                {address.street} {address.streetNumber}
                {address.apartment ? `, ${address.apartment}` : ''}
              </p>
              <p className="text-[var(--muted)]">
                {address.city}, {address.province}, {address.postalCode}
              </p>
            </article>
          ))}
        </section>
        <AddressForm />
      </div>
    </div>
  );
}
