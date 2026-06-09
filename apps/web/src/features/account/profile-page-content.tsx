'use client';

import { useTranslations } from 'next-intl';
import { ErrorState } from '../../shared/ui/states';
import { useProfile } from './account-hooks';
import { ProfileForm } from './profile-form';

export function ProfilePageContent() {
  const t = useTranslations('account.profilePage');
  const profile = useProfile();

  return (
    <div>
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1 className="display-title mt-4 text-6xl md:text-8xl">{t('title')}</h1>
      <div className="mt-7">
        {profile.error ? <ErrorState message={profile.error.message} /> : null}
        {profile.data ? <ProfileForm profile={profile.data} /> : null}
      </div>
    </div>
  );
}
