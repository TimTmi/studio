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
import { Badge } from '@/components/ui/badge';
import { Power, PowerOff } from 'lucide-react';
import type { Feeder, UserProfile } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';

export default function SettingsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [user, firestore]);

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    
    const [feederId, setFeederId] = useState('');
    const [feedingReminders, setFeedingReminders] = useState(false);
    const [lowFoodAlerts, setLowFoodAlerts] = useState(false);
    const [isPetNameDialogOpen, setIsPetNameDialogOpen] = useState(false);
    const [petName, setPetName] = useState("");

    const feederRef = useMemoFirebase(() => {
        if (!userProfile?.feederId) return null;
        return doc(firestore, `feeders/${userProfile.feederId}`);
    }, [firestore, userProfile?.feederId]);
    
    const { data: feeder, isLoading: isFeederLoading } = useDoc<Feeder>(feederRef);

    useEffect(() => {
        if (userProfile) {
            setFeederId(userProfile.feederId || '');
            setFeedingReminders(userProfile.settings?.feedingReminders ?? false);
            setLowFoodAlerts(userProfile.settings?.lowFoodAlerts ?? false);
        }
        if (feeder) {
            setPetName(feeder.name || "");
        }
    }, [userProfile, feeder]);
    
    const handleFeederSave = (e: FormEvent) => {
        e.preventDefault();
        if (userProfileRef && feederId && user) {
            // 1. Update the user's profile with the feederId
            setDocumentNonBlocking(userProfileRef, {
                feederId,
            }, { merge: true });
            
            // 2. Create or update the feeder document with the ownerId
            const feederDocRef = doc(firestore, `feeders/${feederId}`);
            setDocumentNonBlocking(feederDocRef, {
                ownerId: user.uid,
                id: feederId,
                petType: 'cat',
                name: feeder?.name || "Pet's name"
            }, { merge: true });
            setIsPetNameDialogOpen(true);
        }
    }

    const handlePetNameSave = (e: FormEvent) => {
        e.preventDefault();
        if (feederRef && petName) {
            setDocumentNonBlocking(feederRef, { name: petName }, { merge: true });
            setIsPetNameDialogOpen(false);
        }
    }
    
    const handleNotificationChange = (type: 'feedingReminders' | 'lowFoodAlerts', value: boolean) => {
        if (userProfileRef) {
            const newSettings = {
                ...userProfile?.settings,
                [type]: value,
            };
            if(type === 'feedingReminders') setFeedingReminders(value);
            if(type === 'lowFoodAlerts') setLowFoodAlerts(value);

            setDocumentNonBlocking(userProfileRef, {
                settings: newSettings,
            }, { merge: true });
        }
    };


    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return (
             <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-accent">Settings</h1>
                    <p className="text-muted-foreground">
                    Manage your account and notification preferences.
                    </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-primary">Profile</CardTitle>
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
                        <CardTitle className="text-primary">Notifications</CardTitle>
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
    <>
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-accent">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and notification preferences.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-primary">Profile</CardTitle>
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
                    <div className="flex items-center gap-2">
                        <Input id="feederId" value={feederId} onChange={e => setFeederId(e.target.value)} placeholder="Enter your feeder ID" />
                        {feeder && (
                            <Badge variant={feeder.status === 'online' ? 'default' : 'destructive'}>
                                {feeder.status === 'online' ? <Power className="mr-1 h-3 w-3" /> : <PowerOff className="mr-1 h-3 w-3" />}
                                {feeder.status}
                            </Badge>
                        )}
                    </div>
                </div>
                <Button type="submit">Save Feeder ID</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Notifications</CardTitle>
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
                checked={feedingReminders}
                onCheckedChange={(value) => handleNotificationChange('feedingReminders', value)}
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
                checked={lowFoodAlerts}
                onCheckedChange={(value) => handleNotificationChange('lowFoodAlerts', value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    <Dialog open={isPetNameDialogOpen} onOpenChange={setIsPetNameDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Name Your Pet</DialogTitle>
                <DialogDescription>
                    Your feeder is linked! What's your pet's name?
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePetNameSave}>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pet-name" className="text-right">
                            Pet Name
                        </Label>
                        <Input
                            id="pet-name"
                            value={petName}
                            onChange={(e) => setPetName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Save Name</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    </>
  );
}
