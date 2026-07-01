export type Unit = 'metric' | 'imperial' | 'hybrid';
export type WindFormat = 'compass' | 'degrees';

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function formatTemperature(celsius: number, unit: Unit): string {
  if (unit === 'imperial') return `${Math.round(celsius * 9 / 5 + 32)}°F`;
  return `${Math.round(celsius)}°C`;
}

export function formatWindSpeed(kmh: number, unit: Unit): string {
  if (unit === 'imperial' || unit === 'hybrid') return `${Math.round(kmh / 1.609)} mph`;
  return `${Math.round(kmh)} km/h`;
}

export function formatPrecipitation(mm: number, unit: Unit): string {
  if (unit === 'imperial') return `${(mm / 25.4).toFixed(2)} in`;
  return `${mm} mm`;
}

export function degreesToCompass(degrees: number): string {
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS_POINTS[index];
}

export function formatWindDirection(degrees: number, format: WindFormat): string {
  return format === 'compass' ? degreesToCompass(degrees) : `${Math.round(degrees)}°`;
}
