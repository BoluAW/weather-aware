export type ActivityType =
  | 'trip'
  | 'outdoor_event'
  | 'laundry'
  | 'workout'
  | 'market_run';

export type Verdict = 'green' | 'amber' | 'red';

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  activity_type: ActivityType;
  date: string;
  time: string;
  location_name: string;
  latitude: number;
  longitude: number;
  weather_verdict: Verdict | null;
  notified_at: string | null;
  created_at: string;
  backup_location_name: string | null;
  backup_latitude: number | null;
  backup_longitude: number | null;
}

export interface NotificationLog {
  id: string;
  plan_id: string;
  user_id: string;
  sent_at: string;
  verdict: Verdict;
  message: string;
}

export interface Stakeholder {
  id: string;
  plan_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notify: boolean;
  created_at: string;
}
