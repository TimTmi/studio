'use client';
import { Bone, Cat, Dog, Power, PowerOff, Clock, History, Archive, Drumstick, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from './ui/skeleton';
import type { Feeder } from '@/lib/types';
import { Timestamp, doc } from 'firebase/firestore';
import { useEffect, useState, useMemo, FormEvent } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp, useFirestore, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';


type FeederCardProps = {
  feeder: Feeder;
  lastFeedingTime?: Timestamp;
  nextFeedingTime?: Timestamp;
};

const TimeDisplay = ({ time, prefix }: { time?: Timestamp; prefix: string;}) => {
    const [displayTime, setDisplayTime] = useState('N/A');

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateDisplayTime = () => {
            if (!time) {
                setDisplayTime('N/A');
                return;
            }

            const dateToCompare = time.toDate();
            if (prefix === "Last fed") {
                 setDisplayTime(formatDistanceToNow(dateToCompare, { addSuffix: true }));
            } else {
                 setDisplayTime(format(dateToCompare, 'PPP p'));
            }
        };

        updateDisplayTime();
        
        if (prefix === "Last fed") {
          // Update every minute for relative time
          intervalId = setInterval(updateDisplayTime, 60000); 
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [time, prefix]);

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {prefix === "Last fed" ? <History className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            <span>{prefix}:</span>
            <span className="font-medium text-foreground">{displayTime}</span>
        </div>
    );
};

const LevelBar = ({ label, value, icon, isLow }: { label: string; value: number; icon: React.ReactNode; isLow: boolean; }) => (
    <div>
        <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className={`font-medium ${isLow ? 'text-destructive' : 'text-primary'}`}>
                {value}%
            </span>
        </div>
        <Progress value={value} aria-label={`${value}% ${label} remaining`} />
        {isLow && <p className="mt-2 text-xs text-destructive">{label} is low. Please refill soon.</p>}
    </div>
);


export function FeederCard({ feeder, lastFeedingTime, nextFeedingTime }: FeederCardProps) {
  const { toast } = useToast();
  const [isFeeding, setIsFeeding] = useState(false);
  const app = useFirebaseApp();
  const firestore = useFirestore();

  const [isPetNameDialogOpen, setIsPetNameDialogOpen] = useState(false);
  const [petName, setPetName] = useState(feeder.name || "");
  
  useEffect(() => {
    if(feeder.name) {
        setPetName(feeder.name);
    }
  }, [feeder.name])


  const feederRef = useMemoFirebase(() => {
    if (!feeder?.id) return null;
    return doc(firestore, `feeders/${feeder.id}`);
  }, [firestore, feeder?.id]);

  const isOnline = feeder.status === 'online';
  const bowlLevel = feeder.bowlLevel ?? 0;
  const storageLevelPercent = feeder.currentWeight ?? 0;

  const isLowBowl = bowlLevel < 25;
  const isLowStorage = storageLevelPercent < 25;

  const handleFeedNow = async () => {
    if (!feeder.id) return;
    setIsFeeding(true);
    
    const functions = getFunctions(app);
    const manualFeed = httpsCallable(functions, 'manualFeed');

    try {
      await manualFeed({ feederId: feeder.id });
      toast({
        title: "Dispensing food!",
        description: "Your pet will be fed shortly.",
      });
    } catch (error) {
      console.error("Error calling manualFeed function:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not trigger manual feeding. Check function logs for details.",
      });
    } finally {
        setIsFeeding(false);
    }
  };

  const handlePetNameSave = (e: FormEvent) => {
    e.preventDefault();
    if (feederRef && petName) {
        setDocumentNonBlocking(feederRef, { name: petName }, { merge: true });
        setIsPetNameDialogOpen(false);
        toast({
            title: "Pet Name Updated!",
            description: `Your feeder is now named '${petName}'.`,
        });
    }
  }


  return (
    <>
    <Card className="flex w-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-primary">
              {feeder.petType === 'dog' ? <Dog /> : <Cat />}
              {feeder.name}
            </CardTitle>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsPetNameDialogOpen(true)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Rename Pet</span>
            </Button>
          </div>
          <Badge variant={isOnline ? 'default' : 'destructive'} className="shrink-0">
            {isOnline ? <Power className="mr-1 h-3 w-3" /> : <PowerOff className="mr-1 h-3 w-3" />}
            {feeder.status}
          </Badge>
        </div>
        <CardDescription>Manage your pet's feeding schedule and monitor their food supply.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="space-y-4">
            <LevelBar 
                label="Storage Level" 
                value={storageLevelPercent} 
                icon={<Archive />}
                isLow={isLowStorage && isOnline} 
            />
            <LevelBar 
                label="Bowl Level" 
                value={bowlLevel} 
                icon={<Drumstick />}
                isLow={isLowBowl && isOnline} 
            />
        </div>
        <div className="space-y-2">
            <TimeDisplay time={lastFeedingTime} prefix="Last fed" />
            <TimeDisplay time={nextFeedingTime} prefix="Next feeding" />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="w-full" disabled={!isOnline || isFeeding} onClick={handleFeedNow} variant="sage">
          <Bone className="mr-2" />
          {isFeeding ? 'Feeding...' : 'Feed Now'}
        </Button>
        <Button asChild variant="outline" className="w-full" disabled={!isOnline}>
          <Link href="/schedule">
            Schedule
          </Link>
        </Button>
      </CardFooter>
    </Card>

    <Dialog open={isPetNameDialogOpen} onOpenChange={setIsPetNameDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Rename Your Pet</DialogTitle>
                <DialogDescription>
                    What would you like to name your pet? This name will be shown on the feeder card.
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

FeederCard.Skeleton = function FeederCardSkeleton() {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
           <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
          <div className='space-y-4'>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-4 w-full" />
            </div>
             <div className="space-y-2">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="space-y-2">
             <Skeleton className="h-5 w-40" />
             <Skeleton className="h-5 w-36" />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    )
}
