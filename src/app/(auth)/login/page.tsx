'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const auth = useAuth();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && user) {
            router.push('/dashboard');
        }
    }, [user, isUserLoading, router]);

    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) {
            setError('Please enter email and password.');
            return;
        }
        initiateEmailSignIn(auth, email, password);
    }

  if(isUserLoading || user) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
        <div className="mb-8 text-left">
            <h1 className="text-3xl font-bold">Sign in</h1>
            <p className="text-muted-foreground">Please login to continue to your account.</p>
        </div>
        <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
             <div className="flex items-center space-x-2">
              <Checkbox id="keep-logged-in" />
              <Label htmlFor="keep-logged-in" className="font-normal">Keep me logged in</Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit">Sign in</Button>
        </form>
        <div className="mt-6 text-center text-sm">
          Need an account?{' '}
          <Link href="/signup" className="underline">
            Create one
          </Link>
        </div>
      </div>
  );
}
