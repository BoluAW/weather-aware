import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ActivityType, Plan } from '../../types';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('trip');
  const [date, setDate] = useState(new Date());
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) { setLoading(false); return; }
      const p = data as Plan;
      setPlan(p);
      setName(p.name);
      setActivityType(p.activity_type);
      setDate(new Date(`${p.date}T${p.time}`));
      setLocationName(p.location_name);
      setLatitude(p.latitude);
      setLongitude(p.longitude);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    setError('');
    if (!name.trim()) { setError('Give your plan a name.'); return; }
    if (!locationName.trim() || latitude === null || longitude === null) {
      setError('Location is required.');
      return;
    }
    setSaving(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().slice(0, 5);
      const forecast = await fetchForecast(latitude, longitude);
      const verdict = scoreWeather(forecast, activityType, dateStr, timeStr);

      const { error: updateError } = await supabase
        .from('plans')
        .update({
          name: name.trim(),
          activity_type: activityType,
          date: dateStr,
          time: timeStr,
          location_name: locationName.trim(),
          latitude,
          longitude,
          weather_verdict: verdict,
          notified_at: null,
        })
        .eq('id', id);

      if (updateError) throw updateError;
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }
    router.replace('/(tabs)');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Plan not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Plan name</Text>
        <TextInput
          style={styles.input}
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
        <DateTimeSelector value={date} onChange={setDate} />

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
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </Pressable>

        <Pressable
          style={[styles.deleteBtn, deleting && styles.btnDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete Plan'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  notFound: { fontSize: 16, color: '#64748b' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 8, paddingBottom: 40 },
  error: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 10, fontSize: 14, textAlign: 'center' },
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
  chip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  chipActive: { borderColor: '#0ea5e9', backgroundColor: '#e0f2fe' },
  chipText: { fontSize: 13, color: '#0f172a' },
  saveBtn: { backgroundColor: '#0ea5e9', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  deleteBtnText: { color: '#b91c1c', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
