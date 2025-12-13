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
import { FeedingLogChart } from '@/components/feeding-log-chart';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy, limit } from 'firebase/firestore';

export default function LogsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const logsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collectionGroup(firestore, 'feedingLogs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
  }, [user, firestore]);

  const { data: feedingLogs, isLoading: areLogsLoading } = useCollection(logsQuery);

  const isLoading = isUserLoading || areLogsLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feeding Logs</h1>
        <p className="text-muted-foreground">
          Review your pets' feeding history and analytics.
        </p>
      </div>

      <FeedingLogChart logs={feedingLogs || []} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Feedings</CardTitle>
          <CardDescription>
            A log of the most recent feeding events from all your devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feeder</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">Loading...</TableCell>
                    <TableCell>Loading...</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell className="text-right">...</TableCell>
                  </TableRow>
                ))
              ) : feedingLogs && feedingLogs.length > 0 ? (
                feedingLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.feederName}</TableCell>
                    <TableCell>
                      {format(new Date(log.timestamp), 'PPP p')}
                    </TableCell>
                    <TableCell>{log.portionSize} cups</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status === 'success' ? 
                              <CheckCircle2 className="mr-1 h-3 w-3" /> :
                              <XCircle className="mr-1 h-3 w-3" />
                          }
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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
