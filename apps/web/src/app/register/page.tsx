import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '../../features/auth/auth-form';

export const metadata: Metadata = {
  title: 'Register',
};

export default function RegisterPage() {
  return (
    <section className="page-shell grid min-h-[72vh] items-center gap-8 lg:grid-cols-[1fr_34rem]">
      <div>
        <p className="eyebrow">New account</p>
        <h1 className="display-title mt-5 text-6xl md:text-8xl">Build the wardrobe.</h1>
      </div>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </section>
  );
}
