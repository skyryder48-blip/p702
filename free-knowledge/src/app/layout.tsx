import type { Metadata } from 'next';
import Link from 'next/link';
import { Providers } from './providers';
import { AuthNav } from '@/components/AuthNav';
import { MobileNav } from '@/components/MobileNav';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'free-civics — Know Your Representatives',
    template: '%s | free-civics',
  },
  description: 'Transparent civic intelligence. See voting records, campaign finance, and legislative history for your elected officials.',
  openGraph: {
    type: 'website',
    siteName: 'free-civics',
    title: 'free-civics — Know Your Representatives',
    description: 'Transparent civic intelligence. See voting records, campaign finance, and legislative history for your elected officials.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="header">
            <div className="container">
              <Link href="/" className="header-logo">
                free-civics
              </Link>
              <nav>
                <ul className="header-nav">
                  <li><Link href="/">Search</Link></li>
                  <li><Link href="/compare">Compare</Link></li>
                  <li><Link href="/issues">Issues</Link></li>
                </ul>
              </nav>
              <AuthNav />
              <MobileNav />
            </div>
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
