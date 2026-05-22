import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '../../features/auth/auth-form';

export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginPage() {
  return (
    <section className="page-shell grid min-h-[72vh] items-center gap-8 lg:grid-cols-[1fr_32rem]">
      <div>
        <p className="eyebrow">Account access</p>
        <h1 className="display-title mt-5 text-6xl md:text-8xl">Return to your lane.</h1>
      </div>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </section>
  );
}
