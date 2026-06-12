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
