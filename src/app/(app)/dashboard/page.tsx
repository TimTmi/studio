'use client';
import { FeederCard } from '@/components/feeder-card';
import { useDoc, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, doc, limit, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { Bone } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

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
    // We can't directly query for time in the future with composite HH:mm format.
    // This fetches all and we find the next one on the client.
    // For a production app, storing scheduled times as UTC timestamps for the next event would be better.
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/feedingSchedules`),
      orderBy('scheduledTime', 'asc')
    );
  }, [firestore, userProfile?.feederId]);

  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(nextScheduleQuery);

  const [nextFeeding, setNextFeeding] = useState<{ scheduledTime: string; portionSize: number } | null>(null);

  useEffect(() => {
    if (schedules) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const futureSchedules = schedules.filter(s => s.scheduledTime > currentTime);
      
      if (futureSchedules.length > 0) {
        setNextFeeding(futureSchedules[0]);
      } else if (schedules.length > 0) {
        // If no future schedules for today, the next one is the first one tomorrow
        setNextFeeding(schedules[0]);
      } else {
        setNextFeeding(null);
      }
    }
  }, [schedules]);

  const isLoading = isUserLoading || isProfileLoading || isLastLogLoading || isSchedulesLoading;

  if (isLoading && !userProfile) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Bone className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
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
          <FeederCard 
            userProfile={userProfile}
            lastFeedingTime={lastLog?.[0]?.timestamp}
            nextFeedingTime={nextFeeding?.scheduledTime}
          />
      </div>
    </div>
  );
}
