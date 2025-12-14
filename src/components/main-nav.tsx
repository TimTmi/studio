'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bot,
  Cat,
  Clock,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

import { cn } from '@/lib/utils';


const navItems = [
  { href: '/home', label: 'Home' },
  { href: '/schedule', label: 'Feeding Schedule' },
  { href: '/logs', label: 'Feeding Log' },
  { href: '/chatbot', label: 'AI' },
  { href: '/settings', label: 'Settings' },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center space-x-1 md:flex">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === item.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
