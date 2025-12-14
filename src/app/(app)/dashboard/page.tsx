'use client';
import { FeederCard } from '@/components/feeder-card';
import { useDoc, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, doc, limit, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { Bone, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Feeder } from '@/lib/types';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const feederRef = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return doc(firestore, `feeders/${userProfile.feederId}`);
  }, [firestore, userProfile?.feederId]);
  
  const { data: feeder, isLoading: isFeederLoading } = useDoc<Feeder>(feederRef);

  const lastLogQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/feedingLogs`),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
  }, [firestore, userProfile?.feederId]);

  const { data: lastLog, isLoading: isLastLogLoading } = useCollection(lastLogQuery);

  const nextScheduleQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/feedingSchedules`),
      where('scheduledTime', '>=', Timestamp.now()),
      orderBy('scheduledTime', 'asc'),
      limit(1)
    );
  }, [firestore, userProfile?.feederId]);

  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(nextScheduleQuery);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!userProfile?.feederId) {
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
  
  const isDataLoading = isFeederLoading || isLastLogLoading || isSchedulesLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        <p className="text-muted-foreground">
          Here's an overview of your pet feeder.
        </p>
      </div>
      
      <div className="flex justify-center">
          {isDataLoading || !feeder ?
            <div className="w-full max-w-sm">
              <FeederCard.Skeleton />
            </div>
             :
            <div className="w-full max-w-sm">
              <FeederCard 
                feeder={feeder}
                lastFeedingTime={lastLog?.[0]?.timestamp}
                nextFeedingTime={schedules?.[0]?.scheduledTime}
              />
            </div>
          }
      </div>
    </div>
  );
}
