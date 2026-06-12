import * as Location from 'expo-location';

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  // Try Expo's geocoder first
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (place) {
      const lga = place.district || place.subregion;
      const state = place.region;
      const country = place.country;
      const label = [lga, state, country].filter(Boolean).join(', ');
      if (label) return label;
    }
  } catch {
    // fall through to Nominatim
  }

  // Fallback: Nominatim (OpenStreetMap) — works reliably on web and native
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address ?? {};

    const lga =
      a.local_government_area ||
      a.county ||
      a.city_district ||
      a.suburb ||
      a.town ||
      a.village ||
      a.city;

    const state = a.state;
    const country = a.country;

    const label = [lga, state, country].filter(Boolean).join(', ');
    if (label) return label;
  } catch {
    // fall through
  }

  // Last resort — readable coords, not raw numbers
  return `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
}
