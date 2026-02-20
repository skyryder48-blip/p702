'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="mobile-nav-wrapper">
      <button
        className="mobile-nav-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <span className={`hamburger ${open ? 'open' : ''}`}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setOpen(false)} />
          <nav className="mobile-nav-panel" aria-label="Mobile navigation">
            <ul>
              <li><Link href="/" onClick={() => setOpen(false)}>Search</Link></li>
              <li><Link href="/compare" onClick={() => setOpen(false)}>Compare</Link></li>
              <li><Link href="/issues" onClick={() => setOpen(false)}>Issues</Link></li>
              <li className="mobile-nav-divider" />
              {session ? (
                <>
                  <li><Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link></li>
                  <li>
                    <button onClick={() => { signOut(); setOpen(false); }} className="mobile-nav-signout">
                      Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <li><Link href="/login" onClick={() => setOpen(false)}>Sign In</Link></li>
              )}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
