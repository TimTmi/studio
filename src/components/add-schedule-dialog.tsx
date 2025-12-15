'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Checkbox } from './ui/checkbox';

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const scheduleFormSchema = z.object({
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time in HH:mm format."),
  days: z.array(z.string()).min(1, "Please select at least one day."),
  applyToAll: z.boolean().default(false),
}).refine(data => data.applyToAll || data.days.length > 0, {
    message: "Please select at least one day or check 'Apply to all days'.",
    path: ["days"],
});


type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface AddScheduleDialogProps {
  onAddTime: (days: string[], time: string, applyToAll: boolean) => void;
}

export function AddScheduleDialog({ onAddTime }: AddScheduleDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      time: '08:00',
      days: [],
      applyToAll: false,
    },
  });

  function onSubmit(data: ScheduleFormValues) {
    onAddTime(data.days, data.time, data.applyToAll);
    form.reset({ time: form.getValues('time'), days: [], applyToAll: false });
    setOpen(false);
  }

  const applyToAll = form.watch('applyToAll');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Routine</DialogTitle>
          <DialogDescription>
            Select the days and time for a recurring feeding.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feeding Time</FormLabel>
                  <FormControl>
                     <Input 
                      type="time"
                      {...field}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="applyToAll"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Apply to all days
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {!applyToAll && (
                <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Days of the Week</FormLabel>
                    <FormControl>
                        <ToggleGroup 
                            type="multiple" 
                            variant="outline" 
                            className="flex-wrap justify-start"
                            value={field.value}
                            onValueChange={field.onChange}
                        >
                            {DAYS_OF_WEEK.map(day => (
                                <ToggleGroupItem key={day} value={day} aria-label={`Toggle ${day}`} className="capitalize">
                                    {day.substring(0,3)}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save Schedule</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
