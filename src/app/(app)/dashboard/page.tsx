'use client';
import { FeederCard } from '@/components/feeder-card';
import { useCollection, useUser, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const feedersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/feeders`));
  }, [user, firestore]);

  const { data: feeders, isLoading: areFeedersLoading } = useCollection(feedersQuery);

  if (isUserLoading || areFeedersLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Here's an overview of your pet feeders.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeederCard.Skeleton />
            <FeederCard.Skeleton />
            <FeederCard.Skeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Here's an overview of your pet feeders.
        </p>
      </div>
      {feeders && feeders.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {feeders.map((feeder) => (
                <FeederCard key={feeder.id} feeder={feeder} />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 bg-muted/20 p-12 text-center">
            <h3 className="text-lg font-semibold">No Feeders Found</h3>
            <p className="text-sm text-muted-foreground">You haven't added any pet feeders yet.</p>
        </div>
      )}
    </div>
  );
}
