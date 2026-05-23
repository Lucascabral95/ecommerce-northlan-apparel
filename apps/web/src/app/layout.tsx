import type { Metadata } from 'next';
import { HomeMarquee } from '../features/home/home-marquee';
import { Footer } from '../shared/ui/footer';
import { Header } from '../shared/ui/header';
import { AppProviders } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Northlane Apparel',
    template: '%s | Northlane Apparel',
  },
  description:
    'Premium apparel commerce powered by Northlane Apparel product stories and a resilient event-driven checkout.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <div className="site-frame">
            <HomeMarquee />
            <Header />
            <main className="site-main">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
