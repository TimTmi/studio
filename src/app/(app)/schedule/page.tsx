'use client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, orderBy, deleteDoc, Timestamp } from 'firebase/firestore';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { FeedingSchedule } from '@/lib/types';
import { format } from 'date-fns';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';

export default function SchedulePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('12:00');

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const schedulesQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/feedingSchedules`),
      where('scheduledTime', '>=', new Date()),
      orderBy('scheduledTime', 'asc')
    );
  }, [firestore, userProfile?.feederId]);
  
  const { data: schedules, isLoading: areSchedulesLoading } = useCollection<FeedingSchedule>(schedulesQuery);

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!userProfile?.feederId) return;
    try {
      const scheduleDocRef = doc(firestore, `feeders/${userProfile.feederId}/feedingSchedules`, scheduleId);
      await deleteDoc(scheduleDocRef);
      toast({ title: 'Schedule Removed', description: 'The feeding has been removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Could not remove the schedule.', variant: 'destructive' });
    }
  };

  const handleAddSchedule = async () => {
    if (!date || !time || !userProfile?.feederId) {
        toast({ title: 'Incomplete Information', description: 'Please select both a date and a time.', variant: 'destructive'});
        return;
    }

    const [hours, minutes] = time.split(':');
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    
    if (scheduledDateTime < new Date()) {
        toast({ title: 'Invalid Time', description: 'You cannot schedule a feeding in the past.', variant: 'destructive'});
        return;
    }

    const schedulesColRef = collection(firestore, `feeders/${userProfile.feederId}/feedingSchedules`);

    try {
        await addDocumentNonBlocking(schedulesColRef, {
            feederId: userProfile.feederId,
            scheduledTime: Timestamp.fromDate(scheduledDateTime),
            sent: false
        });
        toast({ title: 'Schedule Added', description: `A feeding is scheduled for ${format(scheduledDateTime, 'PPP p')}.` });
    } catch (error) {
        toast({ title: 'Error', description: 'Could not add the schedule.', variant: 'destructive' });
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
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-accent">Schedule a Feeding</h1>
            <p className="text-muted-foreground">
                Add individual feeding times for your pet.
            </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Add a New Feeding</CardTitle>
                    <CardDescription>Select a date and time to schedule a single feeding.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex justify-center">
                         <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                            disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                        />
                     </div>
                     <div className='space-y-2'>
                        <label htmlFor="time-input" className="text-sm font-medium">Time</label>
                        <Input
                            id="time-input"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                     </div>
                     <Button onClick={handleAddSchedule} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Feeding Time
                     </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Feedings</CardTitle>
                    <CardDescription>Here are the next scheduled feeding times.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {areSchedulesLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">Loading...</TableCell>
                                <TableCell className="text-right">...</TableCell>
                            </TableRow>
                            ))
                        ) : schedules && schedules.length > 0 ? (
                            schedules.map((schedule) => (
                            <TableRow key={schedule.id}>
                                <TableCell>
                                    {schedule.scheduledTime && format(schedule.scheduledTime.toDate(), 'PPP p')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(schedule.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">
                                No upcoming feedings scheduled.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
