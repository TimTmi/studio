'use client';
import { FeederCard } from '@/components/feeder-card';
import { useDoc, useUser, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bone } from 'lucide-react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Bone className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    // This can happen briefly during loading or if the profile doc doesn't exist
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 bg-muted/20 p-12 text-center">
            <h3 className="text-lg font-semibold">Loading Profile...</h3>
            <p className="mb-4 text-sm text-muted-foreground">Just a moment while we fetch your details.</p>
        </div>
    );
  }
  
  if (!userProfile.feederId) {
    return (
       <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 bg-muted/20 p-12 text-center">
            <h3 className="text-lg font-semibold">No Feeder Linked</h3>
            <p className="mb-4 text-sm text-muted-foreground">You haven't linked a pet feeder to your account yet.</p>
            <Button asChild>
                <Link href="/settings">Go to Settings</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Here's an overview of your pet feeder.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeederCard userProfile={userProfile} />
      </div>
    </div>
  );
}
