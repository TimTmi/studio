'use client';
import { useUser } from '@/firebase';
import Image from 'next/image';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bone } from 'lucide-react';
import Link from 'next/link';

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
    <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-16 w-full items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
             <Image src="/icon.png" alt="Autofeeder Logo" width={40} height={40} />
             <span className="text-lg font-bold">FoodFPet</span>
           </Link>
           <div className="flex flex-1 items-center justify-end space-x-4">
              <MainNav />
              <UserNav />
           </div>
         </div>
       </header>
       <main className="flex-1 p-4 sm:p-6">{children}</main>
     </div>
  );
}
