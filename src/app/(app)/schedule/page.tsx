'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, Timestamp, where } from 'firebase/firestore';
import { PlusCircle, Bone, Loader2 } from 'lucide-react';
import { AddScheduleDialog } from '@/components/add-schedule-dialog';
import Link from 'next/link';
import { format } from 'date-fns';
import { EditScheduleDialog } from '@/components/edit-schedule-dialog';
import type { Feeder } from '@/lib/types';

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

  const schedulesQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/feedingSchedules`),
      where('sent', '==', false),
      orderBy('scheduledTime', 'asc')
    );
  }, [firestore, userProfile?.feederId]);
  
  const { data: schedules, isLoading: areSchedulesLoading } = useCollection(schedulesQuery);
  
  if (isUserLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isProfileLoading) {
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
          You need to link a feeder on the settings page before you can add schedules.
        </p>
        <Button asChild>
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  const isLoading = areSchedulesLoading || isFeederLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feeding Schedules</h1>
        <p className="text-muted-foreground">
          View and manage the automated feeding schedules for your pets.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Upcoming Schedules</CardTitle>
              <CardDescription>
                A list of all currently active feeding schedules.
              </CardDescription>
            </div>
            <AddScheduleDialog feederId={userProfile.feederId} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feeder</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>Loading...</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell className="text-right">...</TableCell>
                  </TableRow>
                ))
              ) : schedules && schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {feeder?.name || 'My Feeder'}
                    </TableCell>
                    <TableCell>{schedule.scheduledTime && format(schedule.scheduledTime.toDate(), 'PPP p')}</TableCell>
                    <TableCell>{schedule.portionSize} grams</TableCell>
                    <TableCell className="text-right">
                      <EditScheduleDialog schedule={schedule} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No upcoming schedules found.
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
