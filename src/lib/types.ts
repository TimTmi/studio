import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  email: string;
  settings?: {
    feedingReminders?: boolean;
    lowFoodAlerts?: boolean;
  };
  feederId?: string;
}

export type Feeder = {
  id: string;
  ownerId: string;
  name?: string;
  location?: string;
  petType?: 'dog' | 'cat';
  status?: 'online' | 'offline';
  bowlLevel?: number;
  storageLevel?: number;
  currentWeight?: number;
}

export type FeedingSchedule = {
  id: string;
  feederId: string;
  scheduledTime: Timestamp;
  sent: boolean;
};


export type FeedingLog = {
  id: string;
  feederId: string;
  timestamp: Timestamp;
  portionSize: number;
  source?: 'manual' | 'scheduled';
};

export type Notification = {
    id: string;
    feederId: string;
    timestamp: Timestamp;
    status: 'success' | 'failed';
    message: string;
}

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
  days: string[];
};
