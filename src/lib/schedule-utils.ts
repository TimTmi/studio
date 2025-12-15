import type { Feeder } from "./types";

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Calculates the next feeding time based on a weekly schedule.
 * @param weeklySchedule The weekly schedule object from the Feeder document.
 * @returns A Date object for the next feeding, or null if no schedule is set.
 */
export function getNextFeedingTime(weeklySchedule: Feeder['weeklySchedule']): Date | null {
    if (!weeklySchedule) return null;

    const now = new Date();
    const todayIndex = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes from midnight

    let nextFeedingTime: Date | null = null;

    // Check for the next feeding time today
    const todayStr = DAYS_OF_WEEK[todayIndex];
    const todaySchedule = weeklySchedule[todayStr as keyof typeof weeklySchedule] || [];
    
    const nextTimeToday = todaySchedule
        .map(timeStr => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        })
        .filter(timeInMinutes => timeInMinutes > currentTime)
        .sort((a, b) => a - b)[0];

    if (nextTimeToday !== undefined) {
        const nextDate = new Date(now);
        nextDate.setHours(Math.floor(nextTimeToday / 60), nextTimeToday % 60, 0, 0);
        return nextDate;
    }

    // If no more feedings today, check the following days of the week
    for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (todayIndex + i) % 7;
        const nextDayStr = DAYS_OF_WEEK[nextDayIndex];
        const nextDaySchedule = weeklySchedule[nextDayStr as keyof typeof weeklySchedule] || [];

        if (nextDaySchedule.length > 0) {
            const firstTimeNextDay = nextDaySchedule
                .map(timeStr => {
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    return hours * 60 + minutes;
                })
                .sort((a, b) => a - b)[0];
            
            const nextDate = new Date(now);
            nextDate.setDate(now.getDate() + i);
            nextDate.setHours(Math.floor(firstTimeNextDay / 60), firstTimeNextDay % 60, 0, 0);
            return nextDate;
        }
    }

    return null; // No scheduled feedings found at all
}
