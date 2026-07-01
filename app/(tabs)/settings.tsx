import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import { useSettings } from '../../contexts/SettingsContext';
import { DisplayMode, usePalette, useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Unit, WindFormat } from '../../lib/units';

const UNIT_OPTIONS: { key: Unit; label: string }[] = [
  { key: 'metric', label: 'METRIC  °C, kph, mm' },
  { key: 'imperial', label: 'IMPERIAL  °F, mph, in' },
  { key: 'hybrid', label: 'HYBRID  °C, mph, mm' },
];

const WIND_OPTIONS: { key: WindFormat; label: string }[] = [
  { key: 'compass', label: 'Compass N, S, E, W' },
  { key: 'degrees', label: 'Degrees 0° - 360°' },
];

const DISPLAY_OPTIONS: { key: DisplayMode; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System Default' },
];

type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'checking';

const PRIVACY_TEXT =
  'Weather Aware uses your device location only to fetch local forecasts and label plans with a place name — it is never sold or shared with third parties. ' +
  'Plan and account data (name, email, plans, weather verdicts) is stored securely in Supabase and tied to your account. ' +
  'Weather data is fetched from Open-Meteo using your coordinates; no personally identifying information is sent with those requests. ' +
  'Push notification tokens are stored only to deliver weather alerts for your own plans and can be cleared by signing out.';

export default function SettingsScreen() {
  const router = useRouter();
  const { unit, windFormat, setUnit, setWindFormat } = useSettings();
  const { displayMode, setDisplayMode } = useTheme();
  const pal = usePalette();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [notifStatus, setNotifStatus] = useState<PermissionStatus>('checking');
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('checking');

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => setNotifStatus(status as PermissionStatus));
    Location.getForegroundPermissionsAsync().then(({ status }) => setLocationStatus(status as PermissionStatus));
  }, []);

  function toggleRow(key: string) {
    setExpandedRow((curr) => (curr === key ? null : key));
  }

  async function handleSignOutPress() {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      confirmTimeout.current = setTimeout(() => setConfirmSignOut(false), 3000);
      return;
    }
    if (confirmTimeout.current) clearTimeout(confirmTimeout.current);
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  async function requestNotifPermission() {
    if (Platform.OS === 'web' || notifStatus === 'denied') {
      Linking.openSettings().catch(() => {});
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifStatus(status as PermissionStatus);
  }

  async function requestLocationPermission() {
    if (Platform.OS === 'web' || locationStatus === 'denied') {
      Linking.openSettings().catch(() => {});
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status as PermissionStatus);
  }

  const statusLabel: Record<PermissionStatus, string> = {
    granted: 'Allowed',
    denied: 'Blocked',
    undetermined: 'Not Requested',
    checking: 'Checking…',
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: pal.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: pal.text }]}>Settings</Text>

        {/* ── CARD 1: Preferences ── */}
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          <SectionHeader icon="🕐" title="Unit System" pal={pal} />
          <View style={styles.radioGroup}>
            {UNIT_OPTIONS.map((opt) => (
              <RadioRow
                key={opt.key}
                label={opt.label}
                selected={unit === opt.key}
                onPress={() => setUnit(opt.key)}
                pal={pal}
              />
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: pal.border }]} />

          <SectionHeader icon="🌬️" title="Wind Direction" pal={pal} />
          <View style={styles.radioGroup}>
            {WIND_OPTIONS.map((opt) => (
              <RadioRow
                key={opt.key}
                label={opt.label}
                selected={windFormat === opt.key}
                onPress={() => setWindFormat(opt.key)}
                pal={pal}
              />
            ))}
          </View>
        </View>

        {/* ── CARD 2: App & Permissions ── */}
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          {/* Display Mode */}
          <ChevronRow
            icon="💡"
            title="Display Mode"
            subtitle={DISPLAY_OPTIONS.find((o) => o.key === displayMode)?.label}
            expanded={expandedRow === 'display'}
            onPress={() => toggleRow('display')}
            pal={pal}
          >
            <View style={styles.dropdownContent}>
              {DISPLAY_OPTIONS.map((opt) => (
                <RadioRow
                  key={opt.key}
                  label={opt.label}
                  selected={displayMode === opt.key}
                  onPress={() => setDisplayMode(opt.key)}
                  pal={pal}
                />
              ))}
            </View>
          </ChevronRow>

          <View style={[styles.divider, { backgroundColor: pal.border }]} />

          {/* Manage Notifications */}
          <ChevronRow
            icon="🔔"
            title="Notifications"
            subtitle={statusLabel[notifStatus]}
            expanded={expandedRow === 'notifications'}
            onPress={() => toggleRow('notifications')}
            pal={pal}
          >
            <View style={styles.dropdownContent}>
              <Text style={[styles.chevronDescription, { color: pal.textMuted }]}>
                Weather alerts are delivered as push notifications before a plan with risky conditions.
                {Platform.OS === 'web' ? ' On web, notifications are controlled by your browser settings.' : ''}
              </Text>
              <AnimatedPressable style={[styles.actionBtn, { backgroundColor: pal.primary }]} onPress={requestNotifPermission}>
                <Text style={styles.actionBtnText}>
                  {notifStatus === 'granted' ? 'Open App Settings' : 'Enable Notifications'}
                </Text>
              </AnimatedPressable>
            </View>
          </ChevronRow>

          <View style={[styles.divider, { backgroundColor: pal.border }]} />

          {/* Location Access */}
          <ChevronRow
            icon="📍"
            title="Location Access"
            subtitle={statusLabel[locationStatus]}
            expanded={expandedRow === 'location'}
            onPress={() => toggleRow('location')}
            pal={pal}
          >
            <View style={styles.dropdownContent}>
              <Text style={[styles.chevronDescription, { color: pal.textMuted }]}>
                Location Access allows the app to fetch local forecasts based on your device GPS. You can adjust this anytime in your settings.
              </Text>
              <AnimatedPressable style={[styles.actionBtn, { backgroundColor: pal.primary }]} onPress={requestLocationPermission}>
                <Text style={styles.actionBtnText}>
                  {locationStatus === 'granted' ? 'Open App Settings' : 'Enable Location Access'}
                </Text>
              </AnimatedPressable>
            </View>
          </ChevronRow>

          <View style={[styles.divider, { backgroundColor: pal.border }]} />

          {/* Privacy Settings */}
          <ChevronRow
            icon="🔒"
            title="Privacy Policy"
            expanded={expandedRow === 'privacy'}
            onPress={() => toggleRow('privacy')}
            pal={pal}
          >
            <View style={styles.dropdownContent}>
              <Text style={[styles.privacyDescription, { color: pal.textMuted }]}>{PRIVACY_TEXT}</Text>
            </View>
          </ChevronRow>
        </View>

        {/* Sign out */}
        <AnimatedPressable
          style={[styles.signOutBtn, confirmSignOut && styles.signOutBtnConfirm]}
          onPress={handleSignOutPress}
          scaleTo={0.97}
        >
          <Text style={[styles.signOutText, confirmSignOut && styles.signOutTextConfirm]}>
            {confirmSignOut ? 'Tap again to confirm sign out' : 'Sign Out'}
          </Text>
        </AnimatedPressable>

        <Text style={[styles.version, { color: pal.textMuted }]}>Version 1.0.1</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type Pal = ReturnType<typeof usePalette>;

function SectionHeader({ icon, title, pal }: { icon: string; title: string; pal: Pal }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconCircle, { backgroundColor: pal.background }]}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: pal.text }]}>{title}</Text>
    </View>
  );
}

function RadioRow({ label, selected, onPress, pal }: { label: string; selected: boolean; onPress: () => void; pal: Pal }) {
  return (
    <AnimatedPressable
      style={[
        styles.radioRow,
        { borderColor: selected ? pal.primary : pal.border, backgroundColor: selected ? pal.primary + '0c' : pal.inputBg }
      ]}
      onPress={onPress}
      scaleTo={0.98}
    >
      <View style={[styles.radioOuter, { borderColor: selected ? pal.primary : '#cbd5e1' }, selected && styles.radioOuterSelected]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: pal.primary }]} />}
      </View>
      <Text style={[styles.radioLabel, { color: pal.text }]}>{label}</Text>
    </AnimatedPressable>
  );
}

function ChevronRow({
  icon,
  title,
  subtitle,
  expanded,
  onPress,
  pal,
  children,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onPress: () => void;
  pal: Pal;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.chevronBlock}>
      <AnimatedPressable style={styles.chevronRow} onPress={onPress} scaleTo={0.98}>
        <View style={styles.chevronLeft}>
          <View style={[styles.sectionIconCircle, { backgroundColor: pal.background }]}>
            {icon ? <Text style={styles.sectionIcon}>{icon}</Text> : null}
          </View>
          <View>
            <Text style={[styles.chevronTitle, { color: pal.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.chevronSubtitle, { color: pal.textMuted }]}>{subtitle}</Text> : null}
          </View>
        </View>
        <Text style={[styles.chevron, { color: pal.textMuted }]}>{expanded ? '⌄' : '›'}</Text>
      </AnimatedPressable>
      {expanded && children && <View style={styles.chevronContent}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 16 },

  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20, paddingHorizontal: 4 },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  divider: { height: 1.5, marginVertical: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.1 },

  radioGroup: { gap: 8, marginTop: 4 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {},
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 14, fontWeight: '600' },

  chevronBlock: {},
  chevronRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevronLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chevronTitle: { fontSize: 15, fontWeight: '800' },
  chevronSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  chevron: { fontSize: 24, fontWeight: '300' },
  chevronDescription: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  privacyDescription: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  chevronContent: { marginTop: 4 },
  dropdownContent: { paddingVertical: 8, paddingLeft: 48, gap: 10 },

  actionBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  signOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutBtnConfirm: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  signOutTextConfirm: { color: '#fff' },

  version: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 24 },
});
