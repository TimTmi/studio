import type { Feeder, Schedule, FeedingLog, User } from './types';

// This file now contains only placeholder data and can be removed or adapted
// as the application fully transitions to Firebase.

export const mockUser: User = {
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  avatarUrl: '',
  notifications: {
    feedingReminders: true,
    lowFoodAlerts: false,
  },
};

export const mockFeeders: Feeder[] = [];
export const mockSchedules: Schedule[] = [];
export const mockFeedingLogs: FeedingLog[] = [];
