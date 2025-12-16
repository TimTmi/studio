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
import { Loader2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import type { FeedingLog } from '@/lib/types';
import { FeedingLogChart } from '@/components/feeding-log-chart';

export default function LogsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const feedingLogsQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/feedingLogs`),
      orderBy('timestamp', 'desc'),
      limit(100) // Fetch last 100 logs for the chart
    );
  }, [firestore, userProfile?.feederId]);

  const { data: feedingLogs, isLoading: areLogsLoading } = useCollection<FeedingLog>(feedingLogsQuery);

  const recentLogs = feedingLogs?.slice(0, 10);

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
        <h1 className="text-2xl font-bold tracking-tight text-accent">Feeding Logs</h1>
        <p className="text-muted-foreground">
          A history of your pet's feeding events.
        </p>
      </div>

      <FeedingLogChart logs={feedingLogs || []} />

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Recent Feedings</CardTitle>
          <CardDescription>
            A log of the most recent feeding events from your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Amount (g)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areLogsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">Loading...</TableCell>
                    <TableCell>Loading...</TableCell>
                    <TableCell className="text-right">...</TableCell>
                  </TableRow>
                ))
              ) : recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                        <Badge variant="outline" className="capitalize">{log.source || 'scheduled'}</Badge>
                    </TableCell>
                    <TableCell>
                      {log.timestamp && format(new Date(log.timestamp.seconds ? log.timestamp.toDate() : log.timestamp), 'PPP p')}
                    </TableCell>
                    <TableCell className="text-right">
                       {typeof log.portionSize === 'number' ? `${log.portionSize.toFixed(1)}g` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No feeding logs found.
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
