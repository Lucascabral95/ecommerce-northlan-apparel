import type { Metadata } from 'next';
import { AccountOverview } from '../../features/account/account-overview';

export const metadata: Metadata = {
  title: 'Account',
};

export default function AccountPage() {
  return <AccountOverview />;
}
