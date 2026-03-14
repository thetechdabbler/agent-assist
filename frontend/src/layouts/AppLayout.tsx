'use client';

import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid #eee', padding: 16 }}>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li>
              <Link href="/conversations">Conversations</Link>
            </li>
            <li>
              <Link href="/goals">Goals</Link>
            </li>
            <li>
              <Link href="/jobs">Task Center</Link>
            </li>
            <li>
              <Link href="/search">Search</Link>
            </li>
            <li>
              <Link href="/notifications">Notifications</Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 16 }}>{children}</main>
    </div>
  );
}
