export type User = {
  name: string;
  email: string;
  avatarUrl: string;
  notifications: {
    feedingReminders: boolean;
    lowFoodAlerts: boolean;
  };
};

export type Feeder = {
  id: string;
  name: string;
  petType: 'dog' | 'cat';
  status: 'online' | 'offline';
  bowlLevel: number; // Percentage 0-100
  nextFeeding: {
    time: string;
    amount: number; // in cups
  };
};

export type Schedule = {
  id: string;
  feederId: string;
  time: string;
  amount: number; // in cups
  days: string[];
};

export type FeedingLog = {
  id: string;
  feederId: string;
  feederName: string;
  timestamp: string;
  amount: number; // in cups
  status: 'success' | 'failed';
};
