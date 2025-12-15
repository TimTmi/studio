'use client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
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
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';

export default function ActivityPage() {
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
  
  const { data: feeder, isLoading: isFeederLoading } = useDoc(feederRef);

  const activityQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/notifications`),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
  }, [firestore, userProfile?.feederId]);

  const { data: activities, isLoading: areActivitiesLoading } = useCollection<Notification>(activityQuery);
  
  if (isUserLoading || isProfileLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-accent">Activity Feed</h1>
        <p className="text-muted-foreground">
          A history of your pet's feeding events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Recent Events</CardTitle>
          <CardDescription>
            A log of the most recent events from your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areActivitiesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">Loading...</TableCell>
                    <TableCell>Loading...</TableCell>
                    <TableCell className="text-right">...</TableCell>
                  </TableRow>
                ))
              ) : activities && activities.length > 0 ? (
                activities.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.message}</TableCell>
                    <TableCell>
                      {log.timestamp && format(new Date(log.timestamp.seconds ? log.timestamp.toDate() : log.timestamp), 'PPP p')}
                    </TableCell>
                    <TableCell className="text-right">
                       <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status === 'success' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                          {log.status}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No activity found.
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
