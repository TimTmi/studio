'use client';
import { FeederCard } from '@/components/feeder-card';
import { useDoc, useUser, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const feederRef = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return doc(firestore, `feeders/${userProfile.feederId}`);
  }, [userProfile?.feederId]);

  const { data: feeder, isLoading: isFeederLoading } = useDoc(feederRef);

  const isLoading = isUserLoading || isProfileLoading || isFeederLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Here's an overview of your pet feeder.
        </p>
      </div>
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeederCard.Skeleton />
        </div>
      ) : feeder ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeederCard feeder={feeder} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 bg-muted/20 p-12 text-center">
            <h3 className="text-lg font-semibold">No Feeder Linked</h3>
            <p className="mb-4 text-sm text-muted-foreground">You haven't linked a pet feeder to your account yet.</p>
            <Button asChild>
                <Link href="/settings">Go to Settings</Link>
            </Button>
        </div>
      )}
    </div>
  );
}
