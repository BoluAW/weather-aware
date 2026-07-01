import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePalette } from '../contexts/ThemeContext';
import { reverseGeocode } from '../lib/geocoding';
import AnimatedPressable from './AnimatedPressable';

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
  const pal = usePalette();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

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
    <View style={styles.container}>
      {/* GPS button */}
      <AnimatedPressable
        style={[
          styles.gpsBtn,
          {
            backgroundColor: pal.background,
            borderColor: pal.border,
          },
        ]}
        onPress={handleGPS}
        disabled={locating}
        scaleTo={0.97}
      >
        {locating ? (
          <ActivityIndicator size="small" color={pal.primary} />
        ) : (
          <Text style={[styles.gpsBtnText, { color: pal.primary }]}>📍 Use Current Location</Text>
        )}
      </AnimatedPressable>

      {/* Search input */}
      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: pal.inputBg,
              borderColor: inputFocused ? pal.primary : pal.border,
              color: pal.text,
            },
          ]}
          placeholder="Or search for a place…"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        {searching && <ActivityIndicator size="small" color={pal.primary} style={styles.spinner} />}
      </View>

      {/* Search results */}
      {results.length > 0 && (
        <View style={[styles.results, { backgroundColor: pal.surface, borderColor: pal.border }]}>
          {results.map((r, i) => (
            <AnimatedPressable
              key={i}
              style={[styles.resultItem, i < results.length - 1 && { borderBottomColor: pal.border }, styles.resultBorder]}
              onPress={() => handleSelect(r)}
              scaleTo={0.98}
            >
              <Text style={[styles.resultText, { color: pal.text }]} numberOfLines={2}>{r.name}</Text>
            </AnimatedPressable>
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
  container: { gap: 8 },
  gpsBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  gpsBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
  },
  spinner: { position: 'absolute', right: 14 },

  results: {
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultBorder: {
    borderBottomWidth: 1,
  },
  resultText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },

  confirmed: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  confirmedText: { fontSize: 13, color: '#10B981', fontWeight: '700' },
});
