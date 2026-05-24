import { localizedMetadata } from '../../../i18n/metadata';
import { AccountOverview } from '../../../features/account/account-overview';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'accountTitle');

export default function AccountPage() {
  return <AccountOverview />;
}
