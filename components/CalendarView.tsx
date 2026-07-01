import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../contexts/ThemeContext';
import { Plan, Verdict } from '../types';
import AnimatedPressable from './AnimatedPressable';

interface Props {
  plans: Plan[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}

const VERDICT_DOT: Record<Verdict, string> = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarView({ plans, selectedDate, onSelectDate }: Props) {
  const pal = usePalette();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const plansByDate = useMemo(() => {
    const map: Record<string, Verdict[]> = {};
    for (const p of plans) {
      if (!map[p.date]) map[p.date] = [];
      if (p.weather_verdict) map[p.date].push(p.weather_verdict);
    }
    return map;
  }, [plans]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function goPrevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function goNextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <View style={[styles.container, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={goPrevMonth} scaleTo={0.85} style={styles.navArrowPressable}>
          <Text style={[styles.navArrow, { color: pal.primary }]}>‹</Text>
        </AnimatedPressable>
        <Text style={[styles.monthLabel, { color: pal.text }]}>{monthLabel}</Text>
        <AnimatedPressable onPress={goNextMonth} scaleTo={0.85} style={styles.navArrowPressable}>
          <Text style={[styles.navArrow, { color: pal.primary }]}>›</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={[styles.weekdayLabel, { color: pal.textMuted }]}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const verdicts = plansByDate[dateStr] ?? [];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;

          return (
            <AnimatedPressable
              key={i}
              style={[
                styles.cell,
                isSelected && { backgroundColor: pal.primary + '18' }, // 10% opacity primary color for selection bg
                isToday && !isSelected && { backgroundColor: pal.background },
              ]}
              onPress={() => onSelectDate(isSelected ? null : dateStr)}
              scaleTo={0.92}
            >
              <Text style={[
                styles.dayNumber,
                { color: pal.text },
                isToday && [styles.dayNumberToday, { color: pal.primary }],
                isSelected && [styles.dayNumberSelected, { color: pal.primary }],
              ]}>
                {day}
              </Text>
              <View style={styles.dotsRow}>
                {verdicts.slice(0, 3).map((v, idx) => (
                  <View key={idx} style={[styles.dot, { backgroundColor: VERDICT_DOT[v] }]} />
                ))}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navArrowPressable: { paddingHorizontal: 12, paddingVertical: 4 },
  navArrow: { fontSize: 24, fontWeight: '700' },
  monthLabel: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginVertical: 1,
  },
  dayNumber: { fontSize: 13, fontWeight: '600' },
  dayNumberToday: { fontWeight: '800' },
  dayNumberSelected: { fontWeight: '800' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 4, height: 4, justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
