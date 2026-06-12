const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

export interface HourlyWeather {
  time: string[];
  precipitation: number[];
  windspeed_10m: number[];
  temperature_2m: number[];
  precipitation_probability: number[];
  relativehumidity_2m: number[];
  weathercode: number[];
}

export interface WeatherForecast {
  hourly: HourlyWeather;
}

export interface WeatherSlice {
  precipitation: number[];
  windspeed_10m: number[];
  temperature_2m: number[];
  precipitation_probability: number[];
  relativehumidity_2m: number[];
}

export async function fetchForecast(
  latitude: number,
  longitude: number
): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: [
      'precipitation',
      'windspeed_10m',
      'temperature_2m',
      'precipitation_probability',
      'relativehumidity_2m',
      'weathercode',
    ].join(','),
    timezone: 'auto',
    forecast_days: '7',
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch weather forecast');
  return res.json();
}

// Returns weather data for a 4-hour window starting at the plan's date+time
export function getHourlySlice(
  forecast: WeatherForecast,
  date: string,
  time: string,
  windowHours = 4
): WeatherSlice {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + windowHours * 3_600_000);

  const indices = forecast.hourly.time.reduce<number[]>((acc, t, i) => {
    const dt = new Date(t);
    if (dt >= start && dt <= end) acc.push(i);
    return acc;
  }, []);

  const pick = <T>(arr: T[]) => indices.map((i) => arr[i]);

  return {
    precipitation: pick(forecast.hourly.precipitation),
    windspeed_10m: pick(forecast.hourly.windspeed_10m),
    temperature_2m: pick(forecast.hourly.temperature_2m),
    precipitation_probability: pick(forecast.hourly.precipitation_probability),
    relativehumidity_2m: pick(forecast.hourly.relativehumidity_2m),
  };
}
