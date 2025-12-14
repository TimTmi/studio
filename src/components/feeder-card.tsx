'use client';
import { Bone, Cat, Dog, Power, Zap, ZapOff } from 'lucide-react';
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
import type { UserProfile } from '@/lib/types';


type FeederCardProps = {
  userProfile: UserProfile;
};

export function FeederCard({ userProfile }: FeederCardProps) {
  const isOnline = userProfile.status === 'online';
  const bowlLevel = userProfile.bowlLevel ?? 0;
  const isLowFood = bowlLevel < 25;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            {userProfile.petType === 'dog' ? <Dog /> : <Cat />}
            {userProfile.name}
          </CardTitle>
          <Badge variant={isOnline ? 'default' : 'destructive'} className="shrink-0">
            {isOnline ? <Zap className="mr-1 h-3 w-3" /> : <ZapOff className="mr-1 h-3 w-3" />}
            {userProfile.status}
          </Badge>
        </div>
        <CardDescription>Manage your pet's feeding schedule and monitor their food supply.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bowl Level</span>
            <span className={`font-medium ${isLowFood ? 'text-destructive' : 'text-foreground'}`}>
              {bowlLevel}%
            </span>
          </div>
          <Progress value={bowlLevel} aria-label={`${bowlLevel}% food remaining`} />
          {isLowFood && isOnline && <p className="mt-2 text-xs text-destructive">Food level is low. Please refill soon.</p>}
        </div>
        {userProfile.nextFeeding && (
             <div>
                <div className="text-sm text-muted-foreground">Next Feeding</div>
                <div className="text-lg font-semibold">{userProfile.nextFeeding.time}</div>
                <div className="text-sm text-muted-foreground">{userProfile.nextFeeding.amount} cups</div>
            </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="w-full" disabled={!isOnline}>
          <Bone className="mr-2" />
          Feed Now
        </Button>
        <Button variant="outline" className="w-full" disabled={!isOnline}>
          Schedule
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
          <div className='space-y-2'>
            <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-1">
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-6 w-16" />
             <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    )
}
