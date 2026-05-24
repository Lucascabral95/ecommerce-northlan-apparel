import { localizedMetadata } from '../../../i18n/metadata';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '../../../features/auth/auth-form';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'loginTitle');

export default async function LoginPage() {
  const t = await getTranslations('auth');

  return (
    <section className="page-shell grid min-h-[72vh] items-center gap-8 lg:grid-cols-[1fr_32rem]">
      <div>
        <p className="eyebrow">{t('loginEyebrow')}</p>
        <h1 className="display-title mt-5 text-6xl md:text-8xl">{t('loginHeadline')}</h1>
      </div>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </section>
  );
}
