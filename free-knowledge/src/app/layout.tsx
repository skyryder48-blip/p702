import type { Metadata } from 'next';
import Link from 'next/link';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'free-civics',
  description: 'Transparent civic intelligence — know your representatives',
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
                  <li><Link href="/about">About</Link></li>
                </ul>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
