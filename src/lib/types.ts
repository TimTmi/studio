import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  settings?: string;
}

export type Feeder = {
  id: string;
  userId: string;
  name: string;
  location?: string;
  petType: 'dog' | 'cat';
  status: 'online' | 'offline';
  bowlLevel: number;
  nextFeeding: {
    time: string;
    amount: number;
  };
};

export type FeedingSchedule = {
  id: string;
  feederId: string;
  userId: string;
  scheduledTime: string;
  portionSize: number;
};

export type FeedingLog = {
  id: string;
  feederId: string;
  userId: string;
  feederName: string;
  timestamp: string | Timestamp;
  portionSize: number;
  amount: number; // for chart
  status: 'success' | 'failed';
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

    