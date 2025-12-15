'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AddScheduleDialog } from '@/components/add-schedule-dialog';
import type { Feeder } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function SchedulePage() {
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

  const handleAddTime = (days: string[], time: string, applyToAll: boolean) => {
    if (!feederRef || !feeder) return;

    const newSchedule = { ...feeder.weeklySchedule };

    const daysToUpdate = applyToAll ? DAYS_OF_WEEK : days;

    daysToUpdate.forEach(day => {
        const dayKey = day as keyof typeof newSchedule;
        const daySchedule = newSchedule[dayKey] || [];
        if (!daySchedule.includes(time)) {
            daySchedule.push(time);
            // Sort times chronologically
            daySchedule.sort((a, b) => a.localeCompare(b));
        }
        newSchedule[dayKey] = daySchedule;
    });

    setDocumentNonBlocking(feederRef, { weeklySchedule: newSchedule }, { merge: true });
  };
  
  const handleDeleteTime = (day: string, time: string) => {
    if (!feederRef || !feeder?.weeklySchedule) return;

    const newSchedule = { ...feeder.weeklySchedule };
    const dayKey = day as keyof typeof newSchedule;
    const daySchedule = newSchedule[dayKey];
    if (daySchedule) {
      newSchedule[dayKey] = daySchedule.filter(t => t !== time);
      setDocumentNonBlocking(feederRef, { weeklySchedule: newSchedule }, { merge: true });
    }
  };

  if (isUserLoading || isProfileLoading || !user) {
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
        <p className="mb-4 text-sm text-muted-foreground">
          You need to link a feeder on the settings page before you can manage schedules.
        </p>
        <Button asChild>
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-2xl font-bold tracking-tight text-accent">Weekly Feeding Routine</h1>
              <p className="text-muted-foreground">
              Set up a recurring feeding schedule for your pet.
              </p>
          </div>
          <AddScheduleDialog onAddTime={handleAddTime} />
      </div>

        {isFeederLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {DAYS_OF_WEEK.map(day => <SkeletonCard key={day} />)}
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {DAYS_OF_WEEK.map(day => {
                const dayKey = day as keyof NonNullable<Feeder['weeklySchedule']>;
                const daySchedule = feeder?.weeklySchedule?.[dayKey];

                return (
                    <Card key={day}>
                    <CardHeader>
                        <CardTitle className="capitalize text-primary">{day}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {daySchedule && daySchedule.length > 0 ? (
                        <div className="space-y-2">
                            {daySchedule.map((time) => (
                            <div key={time} className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
                                <span className="font-mono">{time}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTime(day, time)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Delete time {time}</span>
                                </Button>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <p className="text-sm text-muted-foreground">No feedings scheduled.</p>
                        )}
                    </CardContent>
                    </Card>
                );
            })}
            </div>
        )}
    </div>
  );
}


const SkeletonCard = () => (
    <Card>
      <CardHeader>
        <div className="h-6 w-2/4 rounded-md bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-full rounded-md bg-muted/50 animate-pulse" />
      </CardContent>
    </Card>
)
