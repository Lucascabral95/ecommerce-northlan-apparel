import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Northlane Apparel',
  description: 'Foundation for a premium event-driven apparel e-commerce platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
