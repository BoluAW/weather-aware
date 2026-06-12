import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PlanCard from '../../components/PlanCard';
import { supabase } from '../../lib/supabase';
import { Plan } from '../../types';

export default function DashboardScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

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

  useEffect(() => { fetchPlans(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlans();
  }, []);

  const filtered = search.trim()
    ? plans.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location_name.toLowerCase().includes(search.toLowerCase())
      )
    : plans;

  if (loading) {
    return (
      <LinearGradient colors={['#1B55EE', '#3B75F8', '#96BAFF', '#E0ECFF']} style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1B55EE', '#3B75F8', '#96BAFF', '#E0ECFF']} style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plans</Text>
        <Pressable onPress={() => router.push('/(tabs)/add-plan')}>
          <Text style={styles.createBtn}>⊕  Create New</Text>
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlanCard plan={item} onPress={() => router.push(`/plan/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>
              {search ? 'No plans match your search' : 'No upcoming plans'}
            </Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search term.' : 'Tap "Create New" to add your first plan and get a weather heads-up.'}
            </Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  createBtn: { fontSize: 14, fontWeight: '600', color: '#fff' },

  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 13,
    paddingRight: 48,
    fontSize: 15,
    color: '#0f172a',
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    top: 13,
    fontSize: 16,
  },

  list: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', paddingHorizontal: 32 },
});
