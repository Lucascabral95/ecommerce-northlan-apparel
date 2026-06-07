'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Button } from '../../shared/ui/button';
import { useCreateAddress } from './account-hooks';
import { ARGENTINA_COUNTRY_NAME, ARGENTINA_PROVINCES } from './argentina-locations';
import { createAddressSchema, type AddressValues } from './address-validation';

export function AddressForm() {
  const t = useTranslations('account.addressForm');
  const validation = useTranslations('validation');
  const mutation = useCreateAddress();
  const addressSchema = createAddressSchema(validation);
  const form = useForm<AddressValues>({
    defaultValues: {
      alias: 'Home',
      apartment: '',
      city: '',
      country: ARGENTINA_COUNTRY_NAME,
      isDefault: false,
      phone: '',
      postalCode: '',
      province: undefined,
      recipientName: '',
      references: '',
      street: '',
      streetNumber: '',
    },
    resolver: zodResolver(addressSchema),
  });

  return (
    <form
      className="surface grid gap-4 rounded-[2rem] p-6 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        mutation.mutate(values, {
          onSuccess: () => form.reset(),
        }),
      )}
    >
      <Field error={form.formState.errors.alias?.message} label={t('alias')}>
        <input className="field" {...form.register('alias')} />
      </Field>
      <Field error={form.formState.errors.recipientName?.message} label={t('recipient')}>
        <input className="field" {...form.register('recipientName')} />
      </Field>
      <Field error={form.formState.errors.phone?.message} label={t('phone')}>
        <input className="field" {...form.register('phone')} />
      </Field>
      <Field error={form.formState.errors.country?.message} label={t('country')}>
        <input className="field cursor-not-allowed opacity-80" readOnly {...form.register('country')} />
      </Field>
      <Field error={form.formState.errors.province?.message} label={t('province')}>
        <select className="field" defaultValue="" {...form.register('province')}>
          <option value="" disabled>
            {t('selectProvince')}
          </option>
          {ARGENTINA_PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </Field>
      <Field error={form.formState.errors.city?.message} label={t('city')}>
        <input className="field" {...form.register('city')} />
      </Field>
      <Field error={form.formState.errors.postalCode?.message} label={t('postalCode')}>
        <input className="field" {...form.register('postalCode')} />
      </Field>
      <Field error={form.formState.errors.street?.message} label={t('street')}>
        <input className="field" {...form.register('street')} />
      </Field>
      <Field error={form.formState.errors.streetNumber?.message} label={t('streetNumber')}>
        <input className="field" {...form.register('streetNumber')} />
      </Field>
      <Field label={t('apartment')}>
        <input className="field" {...form.register('apartment')} />
      </Field>
      <Field label={t('references')}>
        <input className="field" {...form.register('references')} />
      </Field>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" {...form.register('isDefault')} />
          {t('defaultAddress')}
        </label>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? t('saving') : t('addAddress')}
        </Button>
      </div>
    </form>
  );
}

function Field({
  children,
  error,
  label,
}: Readonly<{ children: React.ReactNode; error?: string; label: string }>) {
  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
      {label}
      {children}
      {error ? <span className="normal-case tracking-normal text-red-800">{error}</span> : null}
    </label>
  );
}
