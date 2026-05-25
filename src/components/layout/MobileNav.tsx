'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './Sidebar';

export function MobileNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  const items = navItems.slice(0, 5);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-2.5"
            style={{
              color: active ? '#1B4332' : '#9CA3AF',
              textDecoration: 'none',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
