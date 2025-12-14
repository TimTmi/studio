import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  settings?: string;
  feederId?: string;
  // Feeder properties are now embedded
  name?: string;
  location?: string;
  petType?: 'dog' | 'cat';
  status?: 'online' | 'offline';
  bowlLevel?: number;
}

export type FeedingSchedule = {
  id: string;
  feederId: string;
  scheduledTime: Timestamp;
  portionSize: number;
};

export type FeedingLog = {
  id: string;
  feederId: string;
  timestamp: Timestamp;
  portionSize: number;
  amount: number; // for chart
};

// Legacy type from mock data, can be removed once all components are updated
export type User = {
  name: string;
  email: string;
  avatarUrl: string;
  notifications: {
    feedingReminders: boolean;
    lowFoodAlerts: boolean;

  };
};

// Legacy type from mock data
export type Schedule = {
  id: string;
  feederId: string;
  time: string;
  amount: number; // in cups
  days: string[];
};
