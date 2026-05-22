'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ApiError } from '../../shared/api/client';
import { Button } from '../../shared/ui/button';
import { useToastStore } from '../../shared/ui/toast';
import { login, register } from './auth-api';
import { useAuthStore } from './auth-store';
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from './auth-validation';

export function AuthForm({ mode }: Readonly<{ mode: 'login' | 'register' }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const pushToast = useToastStore((state) => state.push);
  const schema = mode === 'login' ? loginSchema : registerSchema;
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
    onError: (error) => pushToast(resolveAuthErrorMessage(error), 'error'),
    onSuccess: (response) => {
      setSession(response);
      pushToast(mode === 'login' ? 'Welcome back.' : 'Account created.');
      router.replace(resolveNextRoute(searchParams.get('next')));
    },
  });

  return (
    <form
      className="surface grid gap-4 rounded-[2.2rem] p-6 sm:p-9"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <Field error={form.formState.errors.email?.message} label="Email">
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
            label="First name"
          >
            <input className="field" {...form.register('firstName')} />
          </Field>
          <Field
            error={
              'lastName' in form.formState.errors
                ? form.formState.errors.lastName?.message
                : undefined
            }
            label="Last name"
          >
            <input className="field" {...form.register('lastName')} />
          </Field>
        </div>
      ) : null}
      <Field error={form.formState.errors.password?.message} label="Password">
        <input
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="field"
          type="password"
          {...form.register('password')}
        />
      </Field>
      <Button disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Processing' : mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
      <p className="text-sm text-[var(--muted)]">
        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
        <Link
          className="font-semibold text-[var(--ink)] underline"
          href={mode === 'login' ? '/register' : '/login'}
        >
          {mode === 'login' ? 'Register' : 'Login'}
        </Link>
      </p>
    </form>
  );
}

function resolveAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status < 500) {
    return error.message;
  }

  return 'Authentication failed. Check the Gateway and service logs before retrying.';
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
