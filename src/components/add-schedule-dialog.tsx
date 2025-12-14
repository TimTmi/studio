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
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, Timestamp } from 'firebase/firestore';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';

const scheduleFormSchema = z.object({
  scheduledTime: z.date({
    required_error: "A date and time is required.",
  }),
  portionSize: z.coerce.number().min(1, {
    message: 'Portion must be at least 1 gram.',
  }),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface AddScheduleDialogProps {
  feederId: string;
}

export function AddScheduleDialog({ feederId }: AddScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      scheduledTime: new Date(),
      portionSize: 50,
    },
  });

  function onSubmit(data: ScheduleFormValues) {
    if (!feederId) return;

    const schedulesCollectionRef = collection(
      firestore,
      `feeders/${feederId}/feedingSchedules`
    );
    const newSchedule = {
      ...data,
      scheduledTime: Timestamp.fromDate(data.scheduledTime),
      feederId,
      sent: false, // Initialize 'sent' to false
    };
    addDocumentNonBlocking(schedulesCollectionRef, newSchedule);
    form.reset();
    setOpen(false); // Close the dialog
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
          <DialogDescription>
            Enter the date, time, and portion size for the new feeding schedule.
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
              <Button type="submit">Save Schedule</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
