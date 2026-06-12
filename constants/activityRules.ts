import { ActivityType } from '../types';

export interface WeatherThresholds {
  red: {
    precipitation?: number;
    windspeed?: number;
    maxTemperature?: number;
    minTemperature?: number;
    humidity?: number;
  };
  amber: {
    precipitation?: number;
    windspeed?: number;
  };
}

export const ACTIVITY_RULES: Record<ActivityType, WeatherThresholds> = {
  trip: {
    red: { precipitation: 3, windspeed: 40, maxTemperature: 40, minTemperature: -5 },
    amber: { precipitation: 1, windspeed: 25 },
  },
  outdoor_event: {
    red: { precipitation: 0.5, windspeed: 30 },
    amber: { precipitation: 0.1, windspeed: 20 },
  },
  laundry: {
    red: { precipitation: 0.1, humidity: 80 },
    amber: { precipitation: 0.05 },
  },
  workout: {
    red: { precipitation: 1, maxTemperature: 35, windspeed: 40 },
    amber: { precipitation: 0.5, windspeed: 25 },
  },
  market_run: {
    red: { precipitation: 5, windspeed: 50 },
    amber: { precipitation: 2, windspeed: 35 },
  },
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  trip: 'Trip',
  outdoor_event: 'Outdoor Event',
  laundry: 'Laundry',
  workout: 'Workout',
  market_run: 'Market Run',
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  trip: '✈️',
  outdoor_event: '🎪',
  laundry: '👕',
  workout: '🏃',
  market_run: '🛒',
};

export const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'trip',
  'outdoor_event',
  'laundry',
  'workout',
  'market_run',
];
