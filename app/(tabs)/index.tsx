import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import CalendarView from '../../components/CalendarView';
import LoadingScreen from '../../components/LoadingScreen';
import PlanCard from '../../components/PlanCard';
import { usePalette } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Plan } from '../../types';

type ViewMode = 'list' | 'calendar';

export default function DashboardScreen() {
  const router = useRouter();
  const pal = usePalette();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  async function fetchPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (!error && data) setPlans(data as Plan[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlans();
  }, []);

  function toggleViewMode() {
    setViewMode((m) => (m === 'list' ? 'calendar' : 'list'));
    setSelectedDate(null);
  }

  let filtered = search.trim()
    ? plans.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location_name.toLowerCase().includes(search.toLowerCase())
      )
    : plans;

  if (viewMode === 'calendar' && selectedDate) {
    filtered = filtered.filter((p) => p.date === selectedDate);
  }

  if (loading) {
    return <LoadingScreen message="Loading your plans…" />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: pal.background }]}>
      {/* Top Header Card Banner */}
      <LinearGradient
        colors={[pal.primary, pal.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerCard}
      >
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerSubtitle}>WEATHER OUTLOOK</Text>
              <Text style={styles.headerTitle}>My Plans</Text>
            </View>
            <AnimatedPressable
              style={styles.createBtn}
              onPress={() => router.push('/(tabs)/add-plan')}
              scaleTo={0.93}
            >
              <Text style={styles.createBtnText}>⊕  Create Plan</Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Search & view toggle */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: pal.surface,
                borderColor: searchFocused ? pal.primary : pal.border,
                color: pal.text,
              },
              pal.cardShadow,
            ]}
            placeholder="Search plans or locations…"
            placeholderTextColor={pal.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <Text style={[styles.searchIcon, { color: pal.textMuted }]}>🔍</Text>
        </View>
        <AnimatedPressable
          style={[
            styles.toggleBtn,
            { backgroundColor: pal.surface, borderColor: pal.border },
            pal.cardShadow,
          ]}
          onPress={toggleViewMode}
          scaleTo={0.9}
        >
          <Text style={styles.toggleBtnText}>{viewMode === 'list' ? '📅' : '📋'}</Text>
        </AnimatedPressable>
      </View>

      {/* Main content list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlanCard plan={item} onPress={() => router.push(`/plan/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          viewMode === 'calendar' ? (
            <View style={styles.calendarContainer}>
              <CalendarView plans={plans} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={pal.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconCircle, { backgroundColor: pal.surface }]}>
              <Text style={styles.emptyIcon}>📅</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: pal.text }]}>
              {search ? 'No matches found' : selectedDate ? 'No plans on this date' : 'No upcoming plans'}
            </Text>
            <Text style={[styles.emptyText, { color: pal.textMuted }]}>
              {search
                ? 'Try a different search term.'
                : selectedDate
                  ? 'Pick another date or switch back to the list view.'
                  : 'Add your first plan and get automatic weather alerts.'}
            </Text>
            {!search && !selectedDate && (
              <AnimatedPressable
                style={[styles.emptyCreateBtn, { backgroundColor: pal.primary }]}
                onPress={() => router.push('/(tabs)/add-plan')}
              >
                <Text style={styles.emptyCreateText}>Add Plan Now</Text>
              </AnimatedPressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerCard: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 4,
  },
  headerSafe: {
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  createBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 18,
    marginTop: -20, // overlapping into header card slightly
    marginBottom: 16,
    zIndex: 10,
  },
  searchWrap: { flex: 1, position: 'relative' },
  searchInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48,
    fontSize: 15,
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    top: 15,
    fontSize: 16,
  },
  toggleBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnText: { fontSize: 20 },
  list: { paddingHorizontal: 18, paddingBottom: 32, flexGrow: 1, paddingTop: 10 },
  calendarContainer: { marginBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 8,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  emptyCreateBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 10,
  },
  emptyCreateText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
