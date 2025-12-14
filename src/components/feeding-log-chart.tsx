'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { FeedingLog } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';

type FeedingLogChartProps = {
  logs: FeedingLog[];
};

export function FeedingLogChart({ logs }: FeedingLogChartProps) {
  const chartData = useMemo(() => {
    const dataByDay: { [key: string]: number } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dataByDay[dateString] = 0;
    }

    if (logs) {
        logs.forEach(log => {
        const logDate = new Date(log.timestamp.seconds ? log.timestamp.toDate() : log.timestamp);
        logDate.setHours(0,0,0,0);
        
        // Only include logs from the last 7 days
        if(logDate.getTime() >= today.getTime() - 6 * 24 * 60 * 60 * 1000) {
            const dateString = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dataByDay.hasOwnProperty(dateString)) {
                const amount = (log as any).portionSize || log.amount;
                dataByDay[dateString] += amount;
            }
        }
        });
    }

    return Object.keys(dataByDay).map(date => ({
      date,
      amount: parseFloat(dataByDay[date].toFixed(2)),
    }));
  }, [logs]);

  if (!logs) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Feeding Analytics</CardTitle>
                <CardDescription>Total food dispensed (in grams) over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[200px] w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feeding Analytics</CardTitle>
        <CardDescription>Total food dispensed (in grams) over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            amount: {
              label: 'Grams',
              color: 'hsl(var(--primary))',
            },
          }}
          className="min-h-[200px] w-full"
        >
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                unit="g"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
