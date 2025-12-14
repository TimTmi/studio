'use client';
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { FormEvent, useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
    
    const [feederId, setFeederId] = useState('');

    useEffect(() => {
        if (userProfile) {
            setFeederId(userProfile.feederId || '');
        }
    }, [userProfile]);
    
    const handleFeederSave = (e: FormEvent) => {
        e.preventDefault();
        if (userProfileRef && feederId && user) {
            // 1. Update the user's profile with the feederId
            setDocumentNonBlocking(userProfileRef, {
                feederId,
            }, { merge: true });
            
            // 2. Create or update the feeder document with the ownerId
            const feederRef = doc(firestore, `feeders/${feederId}`);
            setDocumentNonBlocking(feederRef, {
                ownerId: user.uid,
                id: feederId,
                name: 'My Pet Feeder', // Default name
                petType: 'cat', // Default petType
            }, { merge: true });
        }
    }

    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return (
             <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">
                    Manage your account and notification preferences.
                    </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                        This is how others will see you on the site.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p>Loading profile...</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>
                        Manage how you receive notifications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p>Loading settings...</p>
                    </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and notification preferences.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Manage your account settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email || ''} disabled />
            </div>
            <Separator />
            <div>
                <h3 className="text-lg font-medium">Feeder Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Link your pet feeder to your account using its unique ID.
                </p>
            </div>
            <form onSubmit={handleFeederSave} className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="feederId">Feeder ID</Label>
                    <Input id="feederId" value={feederId} onChange={e => setFeederId(e.target.value)} placeholder="Enter your feeder ID" />
                </div>
                <Button type="submit">Save Feeder ID</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="feeding-reminders">Feeding Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when a feeding is about to happen.
                </p>
              </div>
              <Switch
                id="feeding-reminders"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="low-food-alerts">Low Food Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when a feeder is running low on food.
                </p>
              </div>
              <Switch
                id="low-food-alerts"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
