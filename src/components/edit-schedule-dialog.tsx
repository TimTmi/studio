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
  DialogClose,
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
import { useFirestore } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import type { FeedingSchedule } from '@/lib/types';

const scheduleFormSchema = z.object({
  scheduledTime: z.date({
    required_error: 'A date and time is required.',
  }),
  portionSize: z.coerce.number().min(1, {
    message: 'Portion must be at least 1 gram.',
  }),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface EditScheduleDialogProps {
  schedule: FeedingSchedule;
}

export function EditScheduleDialog({ schedule }: EditScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      scheduledTime: schedule.scheduledTime.toDate(),
      portionSize: schedule.portionSize,
    },
  });

  function onSubmit(data: ScheduleFormValues) {
    if (!schedule.feederId || !schedule.id) return;

    const scheduleDocRef = doc(
      firestore,
      `feeders/${schedule.feederId}/feedingSchedules/${schedule.id}`
    );

    const updatedSchedule = {
      ...data,
      scheduledTime: Timestamp.fromDate(data.scheduledTime),
    };
    
    setDocumentNonBlocking(scheduleDocRef, updatedSchedule, { merge: true });
    
    form.reset();
    setOpen(false); // Close the dialog
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription>
            Modify the date, time, and portion size for this feeding schedule.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date & Time</FormLabel>
                  <FormControl>
                     <Input 
                      type="datetime-local"
                      value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="portionSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portion Size (grams)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
