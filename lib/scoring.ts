import { ACTIVITY_RULES } from '../constants/activityRules';
import { ActivityType, Verdict } from '../types';
import { getHourlySlice, WeatherForecast } from './weather';

function max(arr: number[]): number {
  return arr.length ? Math.max(...arr) : 0;
}

function min(arr: number[]): number {
  return arr.length ? Math.min(...arr) : 0;
}

export function scoreWeather(
  forecast: WeatherForecast,
  activityType: ActivityType,
  date: string,
  time: string
): Verdict {
  const rules = ACTIVITY_RULES[activityType];
  const slice = getHourlySlice(forecast, date, time);

  const maxPrecip = max(slice.precipitation);
  const maxWind = max(slice.windspeed_10m);
  const maxTemp = max(slice.temperature_2m);
  const minTemp = min(slice.temperature_2m);
  const maxHumidity = max(slice.relativehumidity_2m);

  const { red, amber } = rules;

  if (red.precipitation !== undefined && maxPrecip > red.precipitation) return 'red';
  if (red.windspeed !== undefined && maxWind > red.windspeed) return 'red';
  if (red.maxTemperature !== undefined && maxTemp > red.maxTemperature) return 'red';
  if (red.minTemperature !== undefined && minTemp < red.minTemperature) return 'red';
  if (red.humidity !== undefined && maxHumidity > red.humidity) return 'red';

  if (amber.precipitation !== undefined && maxPrecip > amber.precipitation) return 'amber';
  if (amber.windspeed !== undefined && maxWind > amber.windspeed) return 'amber';

  return 'green';
}

export interface TimeSuggestion {
  date: string;
  time: string;
  verdict: Verdict;
}

function hasForecastData(forecast: WeatherForecast, date: string, time: string): boolean {
  return getHourlySlice(forecast, date, time).temperature_2m.length > 0;
}

// Scans nearby hours over the next 7 days for a better-scoring slot than the
// original date/time. Prefers slots close to the original hour so suggestions
// stay practical (e.g. don't suggest 3am for a market run).
export function suggestBetterTime(
  forecast: WeatherForecast,
  activityType: ActivityType,
  date: string,
  time: string
): TimeSuggestion | null {
  const originalHour = parseInt(time.split(':')[0], 10);
  const now = new Date();
  const hourOffsets = [1, -1, 2, -2, 3, -3, 4, -4];

  const candidates: { date: string; time: string }[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = new Date(`${date}T00:00:00`);
    day.setDate(day.getDate() + dayOffset);
    const dayStr = day.toISOString().split('T')[0];

    const offsets = dayOffset === 0 ? hourOffsets : [0, ...hourOffsets];
    for (const offset of offsets) {
      const hour = originalHour + offset;
      if (hour < 0 || hour > 23) continue;
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const candidateDateTime = new Date(`${dayStr}T${timeStr}:00`);
      if (candidateDateTime <= now) continue;
      candidates.push({ date: dayStr, time: timeStr });
    }
  }

  candidates.sort(
    (a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
  );

  let bestAmber: TimeSuggestion | null = null;

  for (const c of candidates) {
    if (!hasForecastData(forecast, c.date, c.time)) continue;
    const verdict = scoreWeather(forecast, activityType, c.date, c.time);
    if (verdict === 'green') return { ...c, verdict };
    if (verdict === 'amber' && !bestAmber) bestAmber = { ...c, verdict };
  }

  return bestAmber;
}

export function verdictMessage(verdict: Verdict, planName: string): string {
  switch (verdict) {
    case 'red':
      return `⛔ "${planName}" is at high risk — bad weather expected. Consider rescheduling.`;
    case 'amber':
      return `⚠️ Heads up: weather may affect "${planName}". Keep an eye on the forecast.`;
    case 'green':
      return `✅ All clear for "${planName}"! Weather looks good.`;
  }
}
