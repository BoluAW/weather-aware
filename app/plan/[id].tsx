import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import DateTimeSelector from '../../components/DateTimeSelector';
import LoadingScreen from '../../components/LoadingScreen';
import LocationPicker from '../../components/LocationPicker';
import StakeholderManager, { LocalStakeholder } from '../../components/StakeholderManager';
import {
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
  ALL_ACTIVITY_TYPES,
} from '../../constants/activityRules';
import { usePalette } from '../../contexts/ThemeContext';
import { scoreWeather, suggestBetterTime, TimeSuggestion, verdictMessage } from '../../lib/scoring';
import { supabase } from '../../lib/supabase';
import { fetchForecast } from '../../lib/weather';
import { ActivityType, Plan, Verdict } from '../../types';

function formatSuggestion(s: TimeSuggestion) {
  const d = new Date(`${s.date}T${s.time}`);
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
}

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pal = usePalette();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('trip');
  const [date, setDate] = useState(new Date());
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showBackup, setShowBackup] = useState(false);
  const [backupLocationName, setBackupLocationName] = useState('');
  const [backupLatitude, setBackupLatitude] = useState<number | null>(null);
  const [backupLongitude, setBackupLongitude] = useState<number | null>(null);
  const [stakeholders, setStakeholders] = useState<LocalStakeholder[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [suggestion, setSuggestion] = useState<TimeSuggestion | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

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
      setVerdict(p.weather_verdict);
      if (p.backup_location_name) {
        setShowBackup(true);
        setBackupLocationName(p.backup_location_name);
        setBackupLatitude(p.backup_latitude);
        setBackupLongitude(p.backup_longitude);
      }
      setLoading(false);

      const { data: stakeholderRows } = await supabase
        .from('plan_stakeholders')
        .select('*')
        .eq('plan_id', p.id);
      if (stakeholderRows) {
        setStakeholders(stakeholderRows.map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email ?? '',
          phone: s.phone ?? '',
          notify: s.notify,
        })));
      }

      if (p.weather_verdict === 'amber' || p.weather_verdict === 'red') {
        try {
          const forecast = await fetchForecast(p.latitude, p.longitude);
          const better = suggestBetterTime(forecast, p.activity_type, p.date, p.time);
          setSuggestion(better);
        } catch {
          // suggestion is best-effort; ignore failures
        }
      }
    }
    load();
  }, [id]);

  function applySuggestion() {
    if (!suggestion) return;
    setDate(new Date(`${suggestion.date}T${suggestion.time}`));
    setSuggestion(null);
  }

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
      const newVerdict = scoreWeather(forecast, activityType, dateStr, timeStr);

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
          weather_verdict: newVerdict,
          notified_at: null,
          backup_location_name: backupLocationName.trim() || null,
          backup_latitude: backupLatitude,
          backup_longitude: backupLongitude,
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

  async function handleDeletePress() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimeout.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
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
    return <LoadingScreen message="Loading plan details…" />;
  }

  if (!plan) {
    return (
      <View style={[styles.center, { backgroundColor: pal.background }]}>
        <Text style={[styles.notFound, { color: pal.textMuted }]}>Plan not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: pal.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ── WEATHER VERDICT ALERT ── */}
        {verdict && (verdict === 'amber' || verdict === 'red') && (
          <View style={[styles.verdictBanner, verdict === 'red' ? styles.verdictBannerRed : styles.verdictBannerAmber]}>
            <Text style={styles.verdictBannerText}>⚠️ {verdictMessage(verdict, name || 'this plan')}</Text>
            {suggestion && (
              <>
                <Text style={styles.suggestionText}>
                  💡 Better window: <Text style={styles.boldText}>{formatSuggestion(suggestion)}</Text> ({suggestion.verdict === 'green' ? 'Good conditions' : 'Fair conditions'})
                </Text>
                <AnimatedPressable style={[styles.suggestionBtn, { backgroundColor: pal.primary }]} onPress={applySuggestion} scaleTo={0.96}>
                  <Text style={styles.suggestionBtnText}>Use Suggested Time</Text>
                </AnimatedPressable>
              </>
            )}
            {backupLocationName ? (
              <Text style={styles.suggestionText}>
                📍 Or keep this time at your backup location: <Text style={styles.boldText}>{backupLocationName}</Text>
              </Text>
            ) : null}
          </View>
        )}

        {/* ── CARD 1: Plan Details ── */}
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          <Text style={[styles.sectionTitle, { color: pal.text }]}>Plan Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: pal.textMuted }]}>Plan name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: pal.inputBg,
                  borderColor: nameFocused ? pal.primary : pal.border,
                  color: pal.text,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#94a3b8"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: pal.textMuted }]}>Activity type</Text>
            <View style={styles.chipRow}>
              {ALL_ACTIVITY_TYPES.map((type) => {
                const isActive = activityType === type;
                return (
                  <AnimatedPressable
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? pal.primary : pal.inputBg,
                        borderColor: isActive ? pal.primary : pal.border,
                      },
                    ]}
                    onPress={() => setActivityType(type)}
                    scaleTo={0.94}
                  >
                    <Text style={[styles.chipText, { color: isActive ? '#ffffff' : pal.text }]}>
                      {ACTIVITY_ICONS[type]} {ACTIVITY_LABELS[type]}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── CARD 2: Schedule & Location ── */}
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          <Text style={[styles.sectionTitle, { color: pal.text }]}>Schedule & Location</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: pal.textMuted }]}>Date & Time</Text>
            <DateTimeSelector value={date} onChange={setDate} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: pal.textMuted }]}>Location</Text>
            <LocationPicker
              locationName={locationName}
              onSelect={(name, lat, lng) => {
                setLocationName(name);
                setLatitude(lat);
                setLongitude(lng);
              }}
            />
          </View>

          <AnimatedPressable onPress={() => setShowBackup((v) => !v)} scaleTo={0.98} style={styles.backupTogglePressable}>
            <Text style={[styles.backupToggle, { color: pal.primary }]}>
              {showBackup ? '− Remove backup location' : '+ Add a backup location'}
            </Text>
          </AnimatedPressable>

          {showBackup && (
            <View style={styles.backupContainer}>
              <Text style={[styles.label, { color: pal.textMuted }]}>Backup Location</Text>
              <LocationPicker
                locationName={backupLocationName}
                onSelect={(name, lat, lng) => {
                  setBackupLocationName(name);
                  setBackupLatitude(lat);
                  setBackupLongitude(lng);
                }}
              />
            </View>
          )}
        </View>

        {/* ── CARD 3: Stakeholders ── */}
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          <Text style={[styles.sectionTitle, { color: pal.text }]}>Stakeholders</Text>
          <StakeholderManager planId={plan.id} stakeholders={stakeholders} onChange={setStakeholders} />
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionButtons}>
          <AnimatedPressable
            style={[styles.saveBtn, { backgroundColor: pal.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.deleteBtn, confirmDelete && styles.deleteBtnConfirm]}
            onPress={handleDeletePress}
            disabled={deleting}
          >
            <Text style={[styles.deleteBtnText, confirmDelete && styles.deleteBtnTextConfirm]}>
              {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete Plan'}
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, fontWeight: '600' },
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  error: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 12, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  inputGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  backupTogglePressable: { paddingVertical: 4 },
  backupToggle: { fontSize: 14, fontWeight: '700' },
  backupContainer: { marginTop: 4, gap: 6 },
  actionButtons: { gap: 10, marginTop: 8 },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnConfirm: { backgroundColor: '#ef4444' },
  deleteBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  deleteBtnTextConfirm: { color: '#fff' },

  verdictBanner: { borderRadius: 20, padding: 18, gap: 10, borderWidth: 1.5, marginBottom: 4 },
  verdictBannerAmber: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  verdictBannerRed: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  verdictBannerText: { fontSize: 14, color: '#1e293b', fontWeight: '700', lineHeight: 20 },
  suggestionText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  boldText: { fontWeight: '700', color: '#0f172a' },
  suggestionBtn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  suggestionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
