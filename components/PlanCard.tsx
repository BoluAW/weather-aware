import { StyleSheet, Text, View } from 'react-native';
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from '../constants/activityRules';
import { usePalette } from '../contexts/ThemeContext';
import { Plan, Verdict } from '../types';
import AnimatedPressable from './AnimatedPressable';

interface Props {
  plan: Plan;
  onPress?: () => void;
}

const VERDICT_BG: Record<Verdict, string> = {
  green: 'rgba(16, 185, 129, 0.12)',
  amber: 'rgba(245, 158, 11, 0.12)',
  red: 'rgba(239, 68, 68, 0.12)',
};

const VERDICT_COLOR: Record<Verdict, string> = {
  green: '#10B981',
  amber: '#D97706',
  red: '#EF4444',
};

const VERDICT_LABEL: Record<Verdict, string> = {
  green: 'Good',
  amber: 'Fair',
  red: 'Poor',
};

export default function PlanCard({ plan, onPress }: Props) {
  const pal = usePalette();
  const icon = ACTIVITY_ICONS[plan.activity_type];
  const label = ACTIVITY_LABELS[plan.activity_type];
  const verdict = plan.weather_verdict;

  const formattedDate = new Date(`${plan.date}T${plan.time}`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = new Date(`${plan.date}T${plan.time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AnimatedPressable
      style={[
        styles.card,
        {
          backgroundColor: pal.surface,
          borderColor: pal.border,
          borderLeftColor: verdict ? VERDICT_COLOR[verdict] : pal.border,
        },
        pal.cardShadow,
      ]}
      onPress={onPress}
      scaleTo={0.97}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: pal.background }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: pal.text }]} numberOfLines={1}>{plan.name}</Text>
          <Text style={[styles.activityLabel, { color: pal.textMuted }]}>{label}</Text>
        </View>
        {verdict && (
          <View style={[styles.verdictBadge, { backgroundColor: VERDICT_BG[verdict] }]}>
            <Text style={[styles.verdictText, { color: VERDICT_COLOR[verdict] }]}>
              {VERDICT_LABEL[verdict]}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: pal.textMuted }]}>📅  {formattedDate}  ·  {formattedTime}</Text>
        <Text style={[styles.metaText, { color: pal.textMuted }]} numberOfLines={1}>📍  {plan.location_name}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderLeftWidth: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },
  activityLabel: { fontSize: 12, fontWeight: '600' },
  verdictBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'center',
  },
  verdictText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { gap: 6, paddingLeft: 2 },
  metaText: { fontSize: 13, fontWeight: '500' },
});
