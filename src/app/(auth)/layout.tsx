import { Bone } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-3 text-2xl font-bold text-primary">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Bone className="h-6 w-6 text-primary-foreground" />
        </div>
        <Link href="/">PetPal Hub</Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
