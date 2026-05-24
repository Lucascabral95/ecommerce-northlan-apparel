import { localizedMetadata } from '../../../../i18n/metadata';
import { SecurityPageContent } from '../../../../features/account/security-page-content';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'securityTitle');

export default function SecurityPage() {
  return <SecurityPageContent />;
}
