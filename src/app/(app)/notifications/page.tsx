'use client';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { Loader2, BellRing, CheckCircle2, XCircle } from 'lucide-react';
import type { Notification } from '@/lib/types';

export default function NotificationsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const notificationsQuery = useMemoFirebase(() => {
    if (!userProfile?.feederId) return null;
    return query(
      collection(firestore, `feeders/${userProfile.feederId}/notifications`),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [firestore, userProfile?.feederId]);

  const { data: notifications, isLoading: areNotificationsLoading } = useCollection<Notification>(notificationsQuery);
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-accent">Notifications</h1>
        <p className="text-muted-foreground">
          Recent events from your pet feeder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Recent Activity</CardTitle>
          <CardDescription>
            Here's a list of the latest notifications from your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {areNotificationsLoading ? (
             <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
             </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-4 rounded-lg border p-4">
                    {notif.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                    ) : (
                        <XCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                    )}
                    <div className="flex-grow">
                        <p className="font-medium">{notif.message}</p>
                        <p className="text-sm text-muted-foreground">
                            {notif.timestamp ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true }) : ''}
                        </p>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 bg-muted/20 p-12 text-center">
                <BellRing className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Notifications Yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">Recent events from your feeder will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
