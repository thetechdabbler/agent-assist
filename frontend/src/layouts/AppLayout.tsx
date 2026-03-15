'use client';

import Link from 'next/link';
import { NotificationCenter } from '@/components/NotificationCenter';
import { GoalPanel } from '@/components/goals/GoalPanel';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid #eee', padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <GlobalSearchBar />
        </div>
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
            <li style={{ marginTop: 8 }}>
              <NotificationCenter markSeenOnOpen />
            </li>
          </ul>
        </nav>
        <GoalPanel />
      </aside>
      <main style={{ flex: 1, padding: 16 }}>{children}</main>
    </div>
  );
}
