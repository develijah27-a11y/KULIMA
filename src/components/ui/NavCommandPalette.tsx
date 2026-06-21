'use client';

import { CommandPalette, CommandItem } from '@/components/ui/CommandPalette';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  sectionLabel?: string;
}

export function NavCommandPalette({ items }: { items: NavItem[] }) {
  const cmdItems: CommandItem[] = items.map(item => ({
    href: item.href,
    icon: item.icon,
    label: item.label,
    section: item.sectionLabel,
  }));
  return <CommandPalette items={cmdItems} />;
}
