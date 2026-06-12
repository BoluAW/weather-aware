import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimeSelector from '../../components/DateTimeSelector';
import LocationPicker from '../../components/LocationPicker';
import {
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  ALL_ACTIVITY_TYPES,
} from '../../constants/activityRules';
import { scoreWeather } from '../../lib/scoring';
import { supabase } from '../../lib/supabase';
import { fetchForecast } from '../../lib/weather';
import { ActivityType } from '../../types';

export default function AddPlanScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('trip');
  const [date, setDate] = useState(new Date());
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    if (!name.trim()) { setError('Give your plan a name.'); return; }
    if (!locationName.trim() || latitude === null || longitude === null) {
      setError('Please select a location.');
      return;
    }

    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().slice(0, 5);

      const forecast = await fetchForecast(latitude, longitude);
      const verdict = scoreWeather(forecast, activityType, dateStr, timeStr);

      const { data: { user } } = await supabase.auth.getUser();

      // Ensure the user profile row exists before inserting a plan
      await supabase.from('users').upsert(
        { id: user!.id, email: user!.email ?? '', name: user!.user_metadata?.name ?? user!.email?.split('@')[0] ?? 'User' },
        { onConflict: 'id' }
      );

      const { error } = await supabase.from('plans').insert({
        user_id: user!.id,
        name: name.trim(),
        activity_type: activityType,
        date: dateStr,
        time: timeStr,
        location_name: locationName.trim(),
        latitude,
        longitude,
        weather_verdict: verdict,
      });

      if (error) throw error;
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'Could not save plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.label}>Plan name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Beach trip with family"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Activity type</Text>
        <View style={styles.chipRow}>
          {ALL_ACTIVITY_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[styles.chip, activityType === type && styles.chipActive]}
              onPress={() => setActivityType(type)}
            >
              <Text style={styles.chipText}>
                {ACTIVITY_ICONS[type]} {ACTIVITY_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Date & Time</Text>
        <DateTimeSelector value={date} onChange={setDate} minDate={new Date()} />

        <Text style={styles.label}>Location</Text>
        <LocationPicker
          locationName={locationName}
          onSelect={(name, lat, lng) => {
            setLocationName(name);
            setLatitude(lat);
            setLongitude(lng);
          }}
        />

        <Pressable
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>{loading ? 'Checking forecast…' : 'Save Plan'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 10, fontSize: 14, textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 8, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#0ea5e9', backgroundColor: '#e0f2fe' },
  chipText: { fontSize: 13, color: '#0f172a' },
  row: { flexDirection: 'row', gap: 10 },
  dateBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dateBtnText: { fontSize: 14, color: '#0f172a' },
  gpsBtn: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  gpsBtnText: { fontSize: 14, color: '#0284c7', fontWeight: '600' },
  locationConfirm: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10 },
  locationText: { fontSize: 13, color: '#15803d' },
  saveBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
