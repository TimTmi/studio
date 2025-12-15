'use client';
import { useUser } from '@/firebase';
import Image from 'next/image';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bone } from 'lucide-react';
import Link from 'next/link';
import { MobileNav } from '@/components/mobile-nav';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Bone className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    return null; // Or a redirect component
  }

  return (
        <div className="flex min-h-screen w-full flex-col bg-background">
        
      {/* Header */}
      <div className="px-4 pt-4 sm:px-10">
        <header className="
          sticky top-4 z-40
          rounded-xl border
          bg-header-background
          shadow-[0_4px_16px_rgba(80,140,120,0.15)]
        ">
          <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2">
                <MobileNav />
                <Link href="/home" className="hidden items-center gap-2 md:flex">
                    <Image src="/icon.png" alt="Autofeeder Logo" width={32} height={32} />
                    <span className="text-sm font-bold">FoodFPet</span>
                </Link>
            </div>

              <div className="flex items-center gap-6">
                <MainNav />
                <UserNav />
              </div>
            </div>
        </header>
      </div>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>

    </div>
  );
}
