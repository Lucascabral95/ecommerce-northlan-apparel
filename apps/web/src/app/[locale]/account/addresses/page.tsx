import { localizedMetadata } from '../../../../i18n/metadata';
import { AddressesPageContent } from '../../../../features/account/addresses-page-content';

export const generateMetadata = (props: { params: Promise<{ locale: string }> }) =>
  localizedMetadata(props, 'addressesTitle');

export default function AddressesPage() {
  return <AddressesPageContent />;
}
