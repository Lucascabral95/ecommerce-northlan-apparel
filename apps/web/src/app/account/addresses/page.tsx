import type { Metadata } from 'next';
import { AddressesPageContent } from '../../../features/account/addresses-page-content';

export const metadata: Metadata = {
  title: 'Addresses',
};

export default function AddressesPage() {
  return <AddressesPageContent />;
}
