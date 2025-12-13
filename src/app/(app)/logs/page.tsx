import { format } from 'date-fns';
import { mockFeedingLogs } from '@/lib/data';
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

export default function LogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feeding Logs</h1>
        <p className="text-muted-foreground">
          Review your pets' feeding history and analytics.
        </p>
      </div>

      <FeedingLogChart logs={mockFeedingLogs} />

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
              {mockFeedingLogs.slice(0, 10).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.feederName}</TableCell>
                  <TableCell>
                    {format(new Date(log.timestamp), 'PPP p')}
                  </TableCell>
                  <TableCell>{log.amount} cups</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
