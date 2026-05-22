'use client';

import type { UserProfileDto } from '@northlane/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { useUpdateProfile } from './account-hooks';

const profileSchema = z.object({
  birthDate: z.string().optional(),
  documentNumber: z.string().optional(),
  documentType: z.string().optional(),
  firstName: z.string().max(80).optional(),
  gender: z.string().optional(),
  lastName: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  preferredCategories: z.string().optional(),
  preferredSizes: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm({ profile }: Readonly<{ profile: UserProfileDto }>) {
  const mutation = useUpdateProfile();
  const form = useForm<ProfileValues>({
    defaultValues: {
      birthDate: profile.birthDate ?? '',
      documentNumber: profile.documentNumber ?? '',
      documentType: profile.documentType ?? '',
      firstName: profile.firstName ?? '',
      gender: profile.gender ?? '',
      lastName: profile.lastName ?? '',
      phone: profile.phone ?? '',
      preferredCategories: profile.preferredCategories.join(', '),
      preferredSizes: profile.preferredSizes.join(', '),
    },
    resolver: zodResolver(profileSchema),
  });

  return (
    <form
      className="surface grid gap-4 rounded-[2rem] p-6 md:grid-cols-2"
      onSubmit={form.handleSubmit((values) =>
        mutation.mutate({
          ...values,
          preferredCategories: splitCsv(values.preferredCategories),
          preferredSizes: splitCsv(values.preferredSizes),
        }),
      )}
    >
      <Field error={form.formState.errors.firstName?.message} label="First name">
        <input className="field" {...form.register('firstName')} />
      </Field>
      <Field error={form.formState.errors.lastName?.message} label="Last name">
        <input className="field" {...form.register('lastName')} />
      </Field>
      <Field label="Phone">
        <input className="field" {...form.register('phone')} />
      </Field>
      <Field label="Birth date">
        <input className="field" type="date" {...form.register('birthDate')} />
      </Field>
      <Field label="Document type">
        <input className="field" {...form.register('documentType')} />
      </Field>
      <Field label="Document number">
        <input className="field" {...form.register('documentNumber')} />
      </Field>
      <Field label="Preferred sizes">
        <input className="field" placeholder="S, M, L" {...form.register('preferredSizes')} />
      </Field>
      <Field label="Preferred categories">
        <input
          className="field"
          placeholder="Hoodies, Jeans"
          {...form.register('preferredCategories')}
        />
      </Field>
      <Field label="Gender">
        <input className="field" {...form.register('gender')} />
      </Field>
      <div className="flex items-end md:justify-end">
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Saving' : 'Save profile'}
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

function splitCsv(value?: string): readonly string[] {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
