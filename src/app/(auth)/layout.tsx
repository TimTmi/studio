import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-lg bg-card shadow-lg md:grid-cols-2">
        <div className="relative hidden h-full min-h-[480px] md:block">
          <Image
            src="https://picsum.photos/seed/cat-eating/800/1000"
            alt="A cat eating from a bowl"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
            data-ai-hint="cat eating"
          />
        </div>
        <div className="flex flex-col items-center justify-center p-6 sm:p-10">
            {children}
        </div>
      </div>
    </div>
  );
}
