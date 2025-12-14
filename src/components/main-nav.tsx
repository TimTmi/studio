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
  Leaf,
} from 'lucide-react';

import { cn } from '@/lib/utils';


const navItems = [
  { href: '/home', label: 'Home' },
  { href: '/schedule', label: 'Feeding Schedule' },
  { href: '/logs', label: 'Feeding Log' },
  { href: '/chatbot', label: 'AI Assistant', icon: Leaf },
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
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === item.href
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
          )}
        >
          {item.icon && <item.icon className="text-primary" />}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
