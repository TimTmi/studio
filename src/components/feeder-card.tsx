'use client';
import { Bone, Cat, Dog, Power, PowerOff, Clock, History, Archive, Drumstick } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from './ui/skeleton';
import type { Feeder } from '@/lib/types';
import { Timestamp, collection, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type FeederCardProps = {
  feeder: Feeder;
  lastFeedingTime?: Timestamp;
  nextFeedingTime?: Timestamp;
};

const TimeDisplay = ({ time, prefix }: { time?: Timestamp; prefix: string;}) => {
    const [relativeTime, setRelativeTime] = useState('');

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const updateRelativeTime = () => {
            if (!time) {
                setRelativeTime('N/A');
                return;
            }

            const dateToCompare = time.toDate();
            setRelativeTime(formatDistanceToNow(dateToCompare, { addSuffix: true }));
        };

        updateRelativeTime();
        // Update every minute to keep the time fresh
        intervalId = setInterval(updateRelativeTime, 60000); 

        return () => clearInterval(intervalId);
    }, [time]);

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {prefix === "Last fed" ? <History className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            <span>{prefix}:</span>
            <span className="font-medium text-foreground">{relativeTime}</span>
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
            <span className={`font-medium ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                {value}%
            </span>
        </div>
        <Progress value={value} aria-label={`${value}% ${label} remaining`} />
        {isLow && <p className="mt-2 text-xs text-destructive">{label} is low. Please refill soon.</p>}
    </div>
);


export function FeederCard({ feeder, lastFeedingTime, nextFeedingTime }: FeederCardProps) {
  const firestore = useFirestore();
  const isOnline = feeder.status === 'online';
  const bowlLevel = feeder.bowlLevel ?? 0;
  const storageLevel = feeder.storageLevel ?? 0;
  
  const isLowBowl = bowlLevel < 25;
  const isLowStorage = storageLevel < 25;

  const handleFeedNow = () => {
    if (!feeder.id) return;
    const commandsCollectionRef = collection(firestore, `feeders/${feeder.id}/commands`);
    const newCommand = {
      command: 'dispense',
      portionSize: 50, // Default for manual feed in grams
      createdAt: serverTimestamp(),
    };
    addDocumentNonBlocking(commandsCollectionRef, newCommand);
  };

  return (
    <Card className="flex w-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            {feeder.petType === 'dog' ? <Dog /> : <Cat />}
            {feeder.name}
          </CardTitle>
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
                value={storageLevel} 
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
        <Button className="w-full" disabled={!isOnline} onClick={handleFeedNow}>
          <Bone className="mr-2" />
          Feed Now
        </Button>
        <Button asChild variant="outline" className="w-full" disabled={!isOnline}>
          <Link href="/schedule">
            Schedule
          </Link>
        </Button>
      </CardFooter>
    </Card>
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
