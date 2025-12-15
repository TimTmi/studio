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
import { collection, doc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AddScheduleDialog } from '@/components/add-schedule-dialog';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Feeder } from '@/lib/types';
import { format, parse } from 'date-fns';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


export default function SchedulePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

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


  const handleAddSchedule = async (days: string[], time: string, applyToAll: boolean) => {
      if (!feederRef) return;

      const newSchedule = { ...feeder?.weeklySchedule };

      const daysToUpdate = applyToAll ? DAYS_OF_WEEK : days;
      
      daysToUpdate.forEach(day => {
        const daySchedule = newSchedule[day as keyof typeof newSchedule] || [];
        if (!daySchedule.includes(time)) {
          daySchedule.push(time);
          daySchedule.sort(); 
        }
        newSchedule[day as keyof typeof newSchedule] = daySchedule;
      });

      try {
        await setDocumentNonBlocking(feederRef, { weeklySchedule: newSchedule }, { merge: true });
        toast({ title: 'Schedule Updated', description: 'The new feeding time has been added.' });
      } catch (error) {
        toast({ title: 'Error', description: 'Could not update the schedule.', variant: 'destructive' });
      }
  };
  
  const handleDeleteTime = async (day: string, time: string) => {
     if (!feederRef || !feeder?.weeklySchedule) return;

      const newSchedule = { ...feeder.weeklySchedule };
      const daySchedule = newSchedule[day as keyof typeof newSchedule] || [];
      
      const updatedDaySchedule = daySchedule.filter(t => t !== time);
      newSchedule[day as keyof typeof newSchedule] = updatedDaySchedule;

       try {
        await setDocumentNonBlocking(feederRef, { weeklySchedule: newSchedule }, { merge: true });
        toast({ title: 'Time Removed', description: 'The feeding time has been removed from the schedule.' });
      } catch (error) {
        toast({ title: 'Error', description: 'Could not remove the time.', variant: 'destructive' });
      }
  };

  const isLoading = isUserLoading || isProfileLoading || isFeederLoading;

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
              <h1 className="text-2xl font-bold tracking-tight text-accent">Weekly Routine</h1>
              <p className="text-muted-foreground">
                Set up a recurring feeding schedule for your pet for each day of the week.
              </p>
          </div>
          <AddScheduleDialog onAddSchedule={handleAddSchedule} />
      </div>

       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {DAYS_OF_WEEK.map(day => (
                <Card key={day}>
                    <CardHeader>
                        <CardTitle className="capitalize text-primary">{day}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {feeder?.weeklySchedule?.[day as keyof Feeder['weeklySchedule']] && feeder.weeklySchedule[day as keyof Feeder['weeklySchedule']].length > 0 ? (
                           <ul className="space-y-2">
                            {feeder.weeklySchedule[day as keyof Feeder['weeklySchedule']].map(time => {
                                const displayTime = format(parse(time, 'HH:mm', new Date()), 'p');
                                return (
                                    <li key={time} className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
                                        <span>{displayTime}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTime(day, time)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </li>
                                );
                            })}
                           </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No feedings scheduled.</p>
                        )}
                    </CardContent>
                </Card>
            ))}
       </div>
    </div>
  );
}
