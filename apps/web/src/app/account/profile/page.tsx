import type { Metadata } from 'next';
import { ProfilePageContent } from '../../../features/account/profile-page-content';

export const metadata: Metadata = {
  title: 'Profile',
};

export default function ProfilePage() {
  return <ProfilePageContent />;
}
