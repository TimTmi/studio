'use client';
import Link from 'next/link';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';

import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from 'firebase/auth';

export function UserNav() {
    const { user } = useUser();
    const auth = useAuth();

    const handleLogout = () => {
        signOut(auth);
    }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
            <UserIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/settings">
            <DropdownMenuItem>
              <UserIcon />
              Profile
            </DropdownMenuItem>
          </Link>
          <Link href="/settings">
            <DropdownMenuItem>
              <Settings />
              Settings
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
            <LogOut />
            Log out
            </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
