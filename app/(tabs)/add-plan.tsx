import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { ActivityType, Verdict } from '../../types';

interface PendingSave {
  dateStr: string;
  timeStr: string;
  verdict: Verdict;
}

function formatSuggestion(s: TimeSuggestion) {
  const d = new Date(`${s.date}T${s.time}`);
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
}

export default function AddPlanScreen() {
  const router = useRouter();
  const pal = usePalette();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [suggestion, setSuggestion] = useState<TimeSuggestion | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

  async function insertPlan(dateStr: string, timeStr: string, verdict: Verdict) {
    const { data: { user } } = await supabase.auth.getUser();

    // Ensure the user profile row exists before inserting a plan
    await supabase.from('users').upsert(
      { id: user!.id, email: user!.email ?? '', name: user!.user_metadata?.name ?? user!.email?.split('@')[0] ?? 'User' },
      { onConflict: 'id' }
    );

    const { data: plan, error } = await supabase.from('plans').insert({
      user_id: user!.id,
      name: name.trim(),
      activity_type: activityType,
      date: dateStr,
      time: timeStr,
      location_name: locationName.trim(),
      latitude,
      longitude,
      weather_verdict: verdict,
      backup_location_name: backupLocationName.trim() || null,
      backup_latitude: backupLatitude,
      backup_longitude: backupLongitude,
    }).select().single();

    if (error) throw error;

    if (stakeholders.length > 0) {
      await supabase.from('plan_stakeholders').insert(
        stakeholders.map((s) => ({
          plan_id: plan.id,
          name: s.name,
          email: s.email || null,
          phone: s.phone || null,
          notify: s.notify,
        }))
      );
    }

    router.replace('/(tabs)');
  }

  async function handleSave() {
    setError('');
    if (!name.trim()) { setError('Give your plan a name.'); return; }
    if (!locationName.trim() || latitude === null || longitude === null) {
      setError('Please select a location.');
      return;
    }

    setLoading(true);
    setPendingSave(null);
    setSuggestion(null);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().slice(0, 5);

      const forecast = await fetchForecast(latitude, longitude);
      const verdict = scoreWeather(forecast, activityType, dateStr, timeStr);

      if (verdict === 'green') {
        await insertPlan(dateStr, timeStr, verdict);
      } else {
        setPendingSave({ dateStr, timeStr, verdict });
        setSuggestion(suggestBetterTime(forecast, activityType, dateStr, timeStr));
      }
    } catch (err: any) {
      setError(err?.message ?? 'Could not save plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAnyway() {
    if (!pendingSave) return;
    setLoading(true);
    try {
      await insertPlan(pendingSave.dateStr, pendingSave.timeStr, pendingSave.verdict);
    } catch (err: any) {
      setError(err?.message ?? 'Could not save plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function useSuggestedTime() {
    if (!suggestion) return;
    setDate(new Date(`${suggestion.date}T${suggestion.time}`));
    setPendingSave(null);
    setSuggestion(null);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: pal.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ── CARD 1: Activity Info ── */}
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
              placeholder="e.g. Beach trip with family"
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

        {/* ── CARD 2: Date & Location ── */}
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          <Text style={[styles.sectionTitle, { color: pal.text }]}>Schedule & Location</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: pal.textMuted }]}>Date & Time</Text>
            <DateTimeSelector value={date} onChange={setDate} minDate={new Date()} />
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
          <Text style={[styles.sectionTitle, { color: pal.text }]}>Stakeholders (optional)</Text>
          <StakeholderManager stakeholders={stakeholders} onChange={setStakeholders} />
        </View>

        {/* ── VERDICT BANNER / SAVE BUTTON ── */}
        {pendingSave ? (
          <View style={[styles.verdictBanner, pendingSave.verdict === 'red' ? styles.verdictBannerRed : styles.verdictBannerAmber]}>
            <Text style={styles.verdictBannerText}>
              ⚠️ {verdictMessage(pendingSave.verdict, name || 'this plan')}
            </Text>
            {suggestion && (
              <Text style={styles.suggestionText}>
                💡 Better window: <Text style={styles.boldText}>{formatSuggestion(suggestion)}</Text>{' '}
                ({suggestion.verdict === 'green' ? 'Good conditions' : 'Fair conditions'})
              </Text>
            )}
            {backupLocationName ? (
              <Text style={styles.suggestionText}>
                📍 Or keep this time at your backup location: <Text style={styles.boldText}>{backupLocationName}</Text>
              </Text>
            ) : null}
            <View style={styles.bannerBtnRow}>
              {suggestion && (
                <AnimatedPressable style={[styles.suggestionBtn, { flex: 1, backgroundColor: pal.primary }]} onPress={useSuggestedTime}>
                  <Text style={styles.suggestionBtnText}>Use Suggested Time</Text>
                </AnimatedPressable>
              )}
              <AnimatedPressable
                style={[styles.saveAnywayBtn, { flex: 1 }]}
                onPress={handleSaveAnyway}
                disabled={loading}
              >
                <Text style={styles.saveAnywayBtnText}>{loading ? 'Saving…' : 'Save Anyway'}</Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <AnimatedPressable
            style={[styles.saveBtn, { backgroundColor: pal.primary }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>{loading ? 'Checking forecast…' : 'Save Plan'}</Text>
          </AnimatedPressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  verdictBanner: { borderRadius: 20, padding: 18, gap: 12, borderWidth: 1.5, marginTop: 8 },
  verdictBannerAmber: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  verdictBannerRed: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  verdictBannerText: { fontSize: 14, color: '#1e293b', fontWeight: '700', lineHeight: 20 },
  suggestionText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  boldText: { fontWeight: '700', color: '#0f172a' },
  bannerBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  suggestionBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  suggestionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  saveAnywayBtn: { backgroundColor: '#e2e8f0', borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  saveAnywayBtnText: { color: '#334155', fontSize: 13, fontWeight: '700' },
});
