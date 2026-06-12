import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { reverseGeocode } from '../lib/geocoding';

interface LocationResult {
  name: string;
  latitude: number;
  longitude: number;
}

interface Props {
  locationName: string;
  onSelect: (name: string, latitude: number, longitude: number) => void;
}

export default function LocationPicker({ locationName, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  async function handleSearch(text: string) {
    setQuery(text);
    if (text.trim().length < 3) { setResults([]); return; }

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setResults(
        data.map((item: any) => ({
          name: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        }))
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSelect(result: LocationResult) {
    // Shorten the display name to the first 2-3 parts
    const short = result.name.split(',').slice(0, 3).map((s) => s.trim()).join(', ');
    onSelect(short, result.latitude, result.longitude);
    setQuery('');
    setResults([]);
  }

  async function handleGPS() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); return; }
      const loc =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
      const { latitude, longitude } = loc.coords;
      const name = await reverseGeocode(latitude, longitude);
      onSelect(name, latitude, longitude);
    } catch {
      // silently fail
    } finally {
      setLocating(false);
    }
  }

  return (
    <View>
      {/* GPS button */}
      <Pressable style={styles.gpsBtn} onPress={handleGPS} disabled={locating}>
        {locating
          ? <ActivityIndicator size="small" color="#0284c7" />
          : <Text style={styles.gpsBtnText}>📍 Use my current location</Text>
        }
      </Pressable>

      {/* Search input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Or search a place…"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color="#0ea5e9" style={styles.spinner} />}
      </View>

      {/* Search results */}
      {results.length > 0 && (
        <View style={styles.results}>
          {results.map((r, i) => (
            <Pressable
              key={i}
              style={[styles.resultItem, i < results.length - 1 && styles.resultBorder]}
              onPress={() => handleSelect(r)}
            >
              <Text style={styles.resultText} numberOfLines={2}>{r.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Confirmed location */}
      {locationName && !query ? (
        <View style={styles.confirmed}>
          <Text style={styles.confirmedText}>✓  {locationName}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gpsBtn: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  gpsBtnText: { fontSize: 14, color: '#0284c7', fontWeight: '600' },

  searchRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  spinner: { position: 'absolute', right: 14 },

  results: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultText: { fontSize: 13, color: '#0f172a', lineHeight: 18 },

  confirmed: {
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 10,
  },
  confirmedText: { fontSize: 13, color: '#15803d', fontWeight: '500' },
});
