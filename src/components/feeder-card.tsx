import { Bone, Cat, Dog, Power, Zap, ZapOff } from 'lucide-react';
import type { Feeder } from '@/lib/types';
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

type FeederCardProps = {
  feeder: Feeder;
};

export function FeederCard({ feeder }: FeederCardProps) {
  const isOnline = feeder.status === 'online';
  const isLowFood = feeder.bowlLevel < 25;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            {feeder.petType === 'dog' ? <Dog /> : <Cat />}
            {feeder.name}
          </CardTitle>
          <Badge variant={isOnline ? 'default' : 'destructive'} className="shrink-0">
            {isOnline ? <Zap className="mr-1 h-3 w-3" /> : <ZapOff className="mr-1 h-3 w-3" />}
            {feeder.status}
          </Badge>
        </div>
        <CardDescription>Manage your pet's feeding schedule and monitor their food supply.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bowl Level</span>
            <span className={`font-medium ${isLowFood ? 'text-destructive' : 'text-foreground'}`}>
              {feeder.bowlLevel}%
            </span>
          </div>
          <Progress value={feeder.bowlLevel} aria-label={`${feeder.bowlLevel}% food remaining`} />
          {isLowFood && isOnline && <p className="mt-2 text-xs text-destructive">Food level is low. Please refill soon.</p>}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Next Feeding</div>
          <div className="text-lg font-semibold">{feeder.nextFeeding.time}</div>
          <div className="text-sm text-muted-foreground">{feeder.nextFeeding.amount} cups</div>
        </div>
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
