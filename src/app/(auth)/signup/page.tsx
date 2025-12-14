'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const auth = useAuth();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    
    useEffect(() => {
        if (!isUserLoading && user) {
            const userDocRef = doc(firestore, `users/${user.uid}`);
            setDocumentNonBlocking(userDocRef, {
                id: user.uid,
                email: user.email,
            }, { merge: true });

            router.push('/dashboard');
        }
    }, [user, isUserLoading, router, firestore, auth]);


    const handleSignup = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password ) {
            setError('Please fill out all fields.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        initiateEmailSignUp(auth, email, password);
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
            <h1 className="text-3xl font-bold">Sign up</h1>
            <p className="text-muted-foreground">Sign up to enjoy the feature of AutoFeeder</p>
        </div>
        <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button className="w-full" type='submit'>Sign up</Button>
        </form>
        <div className="mt-6 text-center text-sm">
          Already have an account??{' '}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </div>
  );
}
