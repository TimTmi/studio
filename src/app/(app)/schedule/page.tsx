'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useFirebaseApp } from '@/firebase';
import { collection, doc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AddScheduleDialog } from '@/components/add-schedule-dialog';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { FeedingSchedule } from '@/lib/types';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export default function SchedulePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const app = useFirebaseApp();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const schedulesQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/feedingSchedules`),
      where('scheduledTime', '>=', new Date()), // Only show future schedules
      orderBy('scheduledTime', 'asc')
    );
  }, [firestore, userProfile?.feederId]);
  
  const { data: schedules, isLoading: areSchedulesLoading } = useCollection<FeedingSchedule>(schedulesQuery);


  const handleAddSchedule = async (days: string[], time: string, weeks: number) => {
      if (!userProfile?.feederId) {
        toast({ title: 'Error', description: 'No feeder linked to your account.', variant: 'destructive' });
        return;
      }
      setIsGenerating(true);
      toast({ title: 'Generating Schedule', description: 'Please wait while we set up the feeding times...' });

      const functions = getFunctions(app);
      const generateSchedules = httpsCallable(functions, 'generateSchedules');

      try {
        await generateSchedules({
          feederId: userProfile.feederId,
          routine: { days, time },
          weeks,
        });
        toast({ title: 'Success!', description: `Scheduled feedings for the next ${weeks} week(s).` });
      } catch (error) {
        console.error("Error generating schedules:", error);
        toast({ title: 'Error', description: 'Could not generate schedules. Please try again.', variant: 'destructive' });
      } finally {
        setIsGenerating(false);
      }
  };
  
  const handleDeleteSchedule = async (scheduleId: string) => {
     if (!userProfile?.feederId || !scheduleId) return;
     const docRef = doc(firestore, `feeders/${userProfile.feederId}/feedingSchedules/${scheduleId}`);
     try {
       await deleteDoc(docRef);
       toast({ title: 'Schedule Deleted', description: 'The feeding time has been removed.' });
     } catch (error) {
       console.error("Error deleting schedule:", error);
       toast({ title: 'Error', description: 'Could not delete the schedule.', variant: 'destructive' });
     }
  };

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
              <h1 className="text-2xl font-bold tracking-tight text-accent">Upcoming Feedings</h1>
              <p className="text-muted-foreground">
                Add a recurring routine or manage individual upcoming feedings.
              </p>
          </div>
          <AddScheduleDialog onAddSchedule={handleAddSchedule} isGenerating={isGenerating} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Scheduled Times</CardTitle>
          <CardDescription>
            A list of all upcoming, scheduled feeding events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areSchedulesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3} className="h-10 text-center">
                       <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ))
              ) : schedules && schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                        {format(schedule.scheduledTime.toDate(), 'eeee, MMM d')}
                    </TableCell>
                    <TableCell>
                      {format(schedule.scheduledTime.toDate(), 'p')}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteSchedule(schedule.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete schedule</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No feedings scheduled. Click "Add Schedule" to create a new routine.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
