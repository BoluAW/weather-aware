import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from '../constants/activityRules';
import { Plan, Verdict } from '../types';

interface Props {
  plan: Plan;
  onPress?: () => void;
}

const VERDICT_BORDER: Record<Verdict, string> = {
  green: '#1B78FF',
  amber: '#F97316',
  red: '#EF4444',
};

const VERDICT_LABEL: Record<Verdict, string> = {
  green: 'Good conditions',
  amber: 'Fair conditions',
  red: 'Poor conditions',
};

const VERDICT_LABEL_COLOR: Record<Verdict, string> = {
  green: '#1B78FF',
  amber: '#F97316',
  red: '#EF4444',
};

export default function PlanCard({ plan, onPress }: Props) {
  const icon = ACTIVITY_ICONS[plan.activity_type];
  const label = ACTIVITY_LABELS[plan.activity_type];
  const verdict = plan.weather_verdict;

  const borderColor = verdict ? VERDICT_BORDER[verdict] : '#E5E7EB';

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
    <TouchableOpacity
      style={[styles.card, { borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{plan.name}</Text>
          <Text style={styles.activityLabel}>{label}</Text>
        </View>
        {verdict && (
          <Text style={[styles.verdictTag, { color: VERDICT_LABEL_COLOR[verdict] }]}>
            {VERDICT_LABEL[verdict]}
          </Text>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>📅 {formattedDate} · {formattedTime}</Text>
        <Text style={styles.metaText} numberOfLines={1}>📍 {plan.location_name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderBottomWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  activityLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  verdictTag: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaRow: { gap: 4, paddingLeft: 2 },
  metaText: { fontSize: 12, color: '#6b7280' },
});
