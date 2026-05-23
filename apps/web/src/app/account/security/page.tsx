import type { Metadata } from 'next';
import { SecurityPageContent } from '../../../features/account/security-page-content';

export const metadata: Metadata = {
  title: 'Security',
};

export default function SecurityPage() {
  return <SecurityPageContent />;
}
