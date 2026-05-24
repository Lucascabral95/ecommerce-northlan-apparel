import { localizedMetadata } from '../../../i18n/metadata';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '../../../features/auth/auth-form';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'registerTitle');

export default async function RegisterPage() {
  const t = await getTranslations('auth');

  return (
    <section className="page-shell grid min-h-[72vh] items-center gap-8 lg:grid-cols-[1fr_34rem]">
      <div>
        <p className="eyebrow">{t('registerEyebrow')}</p>
        <h1 className="display-title mt-5 text-6xl md:text-8xl">{t('registerHeadline')}</h1>
      </div>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </section>
  );
}
