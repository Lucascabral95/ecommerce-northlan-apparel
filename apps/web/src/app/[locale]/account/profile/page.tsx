import { localizedMetadata } from '../../../../i18n/metadata';
import { ProfilePageContent } from '../../../../features/account/profile-page-content';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'profileTitle');

export default function ProfilePage() {
  return <ProfilePageContent />;
}
