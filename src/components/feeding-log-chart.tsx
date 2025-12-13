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

    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0,0,0,0);
      
      // Only include logs from the last 7 days
      if(logDate.getTime() >= today.getTime() - 6 * 24 * 60 * 60 * 1000) {
        const dateString = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dataByDay.hasOwnProperty(dateString)) {
            dataByDay[dateString] += log.amount;
        }
      }
    });

    return Object.keys(dataByDay).map(date => ({
      date,
      amount: parseFloat(dataByDay[date].toFixed(2)),
    }));
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feeding Analytics</CardTitle>
        <CardDescription>Total food dispensed (in cups) over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            amount: {
              label: 'Cups',
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
                unit="c"
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
