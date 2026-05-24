'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ApiError } from '../../shared/api/client';
import { Button } from '../../shared/ui/button';
import { useToastStore } from '../../shared/ui/toast';
import { login, register } from './auth-api';
import { useAuthStore } from './auth-store';
import {
  createLoginSchema,
  createRegisterSchema,
  type LoginValues,
  type RegisterValues,
} from './auth-validation';

export function AuthForm({ mode }: Readonly<{ mode: 'login' | 'register' }>) {
  const t = useTranslations('auth');
  const validation = useTranslations('validation');
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const pushToast = useToastStore((state) => state.push);
  const schema =
    mode === 'login' ? createLoginSchema(validation) : createRegisterSchema(validation);
  const form = useForm<LoginValues | RegisterValues>({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
    },
    resolver: zodResolver(schema),
  });
  const mutation = useMutation({
    mutationFn: (values: LoginValues | RegisterValues) =>
      mode === 'login' ? login(values) : register(values),
    onError: (error) => pushToast(resolveAuthErrorMessage(error, t('genericError')), 'error'),
    onSuccess: (response) => {
      setSession(response);
      pushToast(mode === 'login' ? t('welcomeBack') : t('accountCreated'));
      router.replace(resolveNextRoute(searchParams.get('next')));
    },
  });

  return (
    <form
      className="surface grid gap-4 rounded-[2.2rem] p-6 sm:p-9"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <Field error={form.formState.errors.email?.message} label={t('email')}>
        <input autoComplete="email" className="field" {...form.register('email')} />
      </Field>
      {mode === 'register' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={
              'firstName' in form.formState.errors
                ? form.formState.errors.firstName?.message
                : undefined
            }
            label={t('firstName')}
          >
            <input className="field" {...form.register('firstName')} />
          </Field>
          <Field
            error={
              'lastName' in form.formState.errors
                ? form.formState.errors.lastName?.message
                : undefined
            }
            label={t('lastName')}
          >
            <input className="field" {...form.register('lastName')} />
          </Field>
        </div>
      ) : null}
      <Field error={form.formState.errors.password?.message} label={t('password')}>
        <input
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="field"
          type="password"
          {...form.register('password')}
        />
      </Field>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? t('processing') : mode === 'login' ? t('signIn') : t('createAccount')}
      </Button>
      <p className="text-sm text-[var(--muted)]">
        {mode === 'login' ? `${t('newHere')} ` : `${t('alreadyAccount')} `}
        <Link
          className="font-semibold text-[var(--ink)] underline"
          href={mode === 'login' ? '/register' : '/login'}
        >
          {mode === 'login' ? t('createAccount') : t('signIn')}
        </Link>
      </p>
    </form>
  );
}

function resolveAuthErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError && error.status < 500) {
    return error.message;
  }

  return fallbackMessage;
}

function resolveNextRoute(next: string | null) {
  if (
    next === '/account' ||
    next === '/account/addresses' ||
    next === '/account/orders' ||
    next === '/account/profile' ||
    next === '/cart' ||
    next === '/checkout'
  ) {
    return next;
  }

  return '/account';
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
