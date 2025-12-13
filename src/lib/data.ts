import type { Feeder, Schedule, FeedingLog, User } from './types';
import { PlaceHolderImages } from './placeholder-images';

const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

export const mockUser: User = {
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  avatarUrl: userAvatar?.imageUrl || 'https://picsum.photos/seed/user-avatar/100/100',
  notifications: {
    feedingReminders: true,
    lowFoodAlerts: false,
  },
};

export const mockFeeders: Feeder[] = [
  {
    id: 'feeder-1',
    name: 'Buddy\'s Diner',
    petType: 'dog',
    status: 'online',
    bowlLevel: 75,
    nextFeeding: {
      time: '08:00',
      amount: 1.5,
    },
  },
  {
    id: 'feeder-2',
    name: 'Whiskers\' Bistro',
    petType: 'cat',
    status: 'online',
    bowlLevel: 40,
    nextFeeding: {
      time: '09:00',
      amount: 0.5,
    },
  },
  {
    id: 'feeder-3',
    name: 'Rocky\'s Feeder',
    petType: 'dog',
    status: 'offline',
    bowlLevel: 0,
    nextFeeding: {
      time: '12:00',
      amount: 2.0,
    },
  },
];

export const mockSchedules: Schedule[] = [
  {
    id: 'schedule-1',
    feederId: 'feeder-1',
    time: '08:00',
    amount: 1.5,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    id: 'schedule-2',
    feederId: 'feeder-1',
    time: '18:00',
    amount: 1.5,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    id: 'schedule-3',
    feederId: 'feeder-2',
    time: '09:00',
    amount: 0.5,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    id: 'schedule-4',
    feederId: 'feeder-2',
    time: '19:00',
    amount: 0.75,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
];

export const mockFeedingLogs: FeedingLog[] = [
  { id: 'log-1', feederId: 'feeder-1', feederName: 'Buddy\'s Diner', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), amount: 1.5, status: 'success' },
  { id: 'log-2', feederId: 'feeder-2', feederName: 'Whiskers\' Bistro', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), amount: 0.5, status: 'success' },
  { id: 'log-3', feederId: 'feeder-1', feederName: 'Buddy\'s Diner', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), amount: 1.5, status: 'success' },
  { id: 'log-4', feederId: 'feeder-2', feederName: 'Whiskers\' Bistro', timestamp: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(), amount: 0.75, status: 'success' },
  { id: 'log-5', feederId: 'feeder-1', feederName: 'Buddy\'s Diner', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), amount: 1.5, status: 'success' },
  { id: 'log-6', feederId: 'feeder-2', feederName: 'Whiskers\' Bistro', timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), amount: 0.5, status: 'failed' },
  { id: 'log-7', feederId: 'feeder-1', feederName: 'Buddy\'s Diner', timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), amount: 1.5, status: 'success' },
  { id: 'log-8', feederId: 'feeder-2', feederName: 'Whiskers\' Bistro', timestamp: new Date(Date.now() - 37 * 60 * 60 * 1000).toISOString(), amount: 0.75, status: 'success' },
];

// Generate more data for the chart
for (let i = 2; i <= 7; i++) {
    mockFeedingLogs.push({ id: `log-d${i}-1`, feederId: 'feeder-1', feederName: 'Buddy\'s Diner', timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(), amount: 3, status: 'success' });
    mockFeedingLogs.push({ id: `log-d${i}-2`, feederId: 'feeder-2', feederName: 'Whiskers\' Bistro', timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(), amount: 1.25, status: 'success' });
}
