export interface WeatherTheme {
  gradient: string[];
  isRaining: boolean;
  label: string;
  icon: string;
}

function isDaytime(): boolean {
  const h = new Date().getHours();
  return h >= 6 && h < 20;
}

export function getTheme(code: number): WeatherTheme {
  const day = isDaytime();

  if (code === 0) return day
    ? { gradient: ['#1a6bbd', '#3a8fd4', '#f0c56a'], isRaining: false, label: 'Clear Sky', icon: '☀️' }
    : { gradient: ['#0a0e2e', '#1a2a6c', '#0f3460'], isRaining: false, label: 'Clear Sky', icon: '🌙' };

  if (code <= 3) return day
    ? { gradient: ['#2c6e9e', '#5b9ec9', '#8db8d4'], isRaining: false, label: 'Partly Cloudy', icon: '⛅' }
    : { gradient: ['#0f1f3d', '#1e3a6e', '#2c5282'], isRaining: false, label: 'Partly Cloudy', icon: '☁️' };

  if (code <= 48)
    return { gradient: ['#3d4a5c', '#5a6a7e', '#7a8a9e'], isRaining: false, label: 'Foggy', icon: '🌫️' };

  if (code <= 55) return day
    ? { gradient: ['#1e3a5f', '#2d5a8e', '#3d7ab0'], isRaining: true, label: 'Drizzle', icon: '🌦️' }
    : { gradient: ['#0a1628', '#0f2040', '#1a3560'], isRaining: true, label: 'Drizzle', icon: '🌧️' };

  if (code <= 65) return day
    ? { gradient: ['#0f2944', '#1a3f6b', '#1e5080'], isRaining: true, label: 'Rainy', icon: '🌧️' }
    : { gradient: ['#060d1a', '#0a1628', '#0f2040'], isRaining: true, label: 'Rainy', icon: '🌧️' };

  if (code <= 77)
    return { gradient: ['#4a7ab0', '#7aa8d0', '#b8d4e8'], isRaining: false, label: 'Snowy', icon: '❄️' };

  if (code <= 82) return day
    ? { gradient: ['#1a3a5f', '#244d7a', '#2d6094'], isRaining: true, label: 'Rain Showers', icon: '🌦️' }
    : { gradient: ['#080f1e', '#0d1a35', '#121f40'], isRaining: true, label: 'Rain Showers', icon: '🌧️' };

  // Thunderstorm
  return { gradient: ['#0a0f1e', '#0f1728', '#1a2035'], isRaining: true, label: 'Thunderstorm', icon: '⛈️' };
}
