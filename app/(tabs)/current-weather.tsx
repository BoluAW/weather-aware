import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RainAnimation from '../../components/RainAnimation';
import { getTheme } from '../../constants/weatherThemes';
import { reverseGeocode } from '../../lib/geocoding';

const { width: W } = Dimensions.get('window');

function WeatherMap({ lat, lon }: { lat: number; lon: number }) {
  if (Platform.OS !== 'web') return null;
  const delta = 0.015;
  const src =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}` +
    `&layer=mapnik&marker=${lat},${lon}`;
  return (
    <View style={mapStyles.container}>
      {React.createElement('iframe', {
        src,
        title: 'Location map',
        style: { width: '100%', height: '100%', border: 'none', borderRadius: 16 },
      })}
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: { height: 200, borderRadius: 16, overflow: 'hidden', marginTop: 10 },
});

interface CurrentWeather {
  temperature_2m: number;
  weathercode: number;
  windspeed_10m: number;
  relativehumidity_2m: number;
  precipitation: number;
  apparent_temperature: number;
}

interface HourlyItem {
  time: string;
  temp: number;
  code: number;
}

interface DayItem {
  date: string;
  code: number;
  high: number;
  low: number;
}

function formatHour(isoTime: string) {
  const hour = parseInt(isoTime.split('T')[1].split(':')[0]);
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatFullDate() {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  return `${day} ${month}, ${weekday}`;
}

export default function CurrentWeatherScreen() {
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [hourly, setHourly] = useState<HourlyItem[]>([]);
  const [daily, setDaily] = useState<DayItem[]>([]);
  const [uvIndex, setUvIndex] = useState(0);
  const [todayHigh, setTodayHigh] = useState(0);
  const [todayLow, setTodayLow] = useState(0);
  const [rainChance, setRainChance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  function animateIn() {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }

  async function load() {
    setLoading(true);
    setError('');
    fadeAnim.setValue(0);
    slideAnim.setValue(30);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('Location permission needed.'); setLoading(false); return; }

      const loc =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));

      const { latitude: lat, longitude: lon } = loc.coords;
      setCoords({ lat, lon });
      setLocationName(await reverseGeocode(lat, lon));

      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m,precipitation',
        hourly: 'temperature_2m,weathercode',
        daily: 'weathercode,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: '7',
      });

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      const data = await res.json();

      setWeather(data.current as CurrentWeather);

      // Today's daily stats
      setUvIndex(Math.round(data.daily.uv_index_max[0] ?? 0));
      setTodayHigh(data.daily.temperature_2m_max[0]);
      setTodayLow(data.daily.temperature_2m_min[0]);
      setRainChance(data.daily.precipitation_probability_max[0] ?? 0);

      // Hourly: remaining hours today (up to 12)
      const todayStr = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();
      const processedHourly: HourlyItem[] = data.hourly.time
        .map((t: string, i: number) => ({ time: t, temp: data.hourly.temperature_2m[i], code: data.hourly.weathercode[i] }))
        .filter(({ time }: { time: string }) => {
          const [date, hms] = time.split('T');
          return date === todayStr && parseInt(hms) >= currentHour;
        })
        .slice(0, 12);
      setHourly(processedHourly);

      // Daily: next 5 days (skip index 0 = today)
      const processedDaily: DayItem[] = data.daily.time.slice(1, 6).map((date: string, i: number) => ({
        date,
        code: data.daily.weathercode[i + 1],
        high: data.daily.temperature_2m_max[i + 1],
        low: data.daily.temperature_2m_min[i + 1],
      }));
      setDaily(processedDaily);

      setLoading(false);
      setTimeout(animateIn, 50);
    } catch (err: any) {
      setError(err?.message ?? 'Could not load weather.');
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const theme = weather ? getTheme(weather.weathercode) : null;
  const gradient = (theme?.gradient ?? ['#1B55EE', '#3B75F8', '#96BAFF']) as [string, string, string];

  const hasAlert = weather && (weather.weathercode >= 80 || weather.windspeed_10m > 40 || uvIndex >= 8);
  const alertText = weather
    ? weather.weathercode >= 80
      ? 'Rapidly changing weather — take care!'
      : weather.windspeed_10m > 40
        ? 'Strong winds expected today'
        : 'High UV index — use sun protection'
    : '';

  if (loading) {
    return (
      <LinearGradient colors={['#1B55EE', '#3B75F8', '#96BAFF']} style={styles.screen}>
        <Text style={styles.loadingText}>Getting your weather…</Text>
      </LinearGradient>
    );
  }

  if (error || !weather) {
    return (
      <LinearGradient colors={['#1B55EE', '#3B75F8', '#96BAFF']} style={styles.screen}>
        <Text style={styles.errorText}>{error || 'Could not load weather.'}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradient} style={styles.screen} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}>

      {theme?.isRaining && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <RainAnimation />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── Gradient section ── */}
        <View style={styles.gradientSection}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Weather Forecast</Text>
            <Pressable onPress={load}>
              <Text style={styles.refreshIcon}>↻</Text>
            </Pressable>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Text style={styles.locationText} numberOfLines={1}>📍 {locationName}</Text>
          </View>

          {/* Alert banner */}
          {hasAlert && (
            <View style={styles.alertBanner}>
              <Text style={styles.alertText}>⚠️  {alertText}</Text>
            </View>
          )}

          {/* Temp + icon */}
          <Animated.View style={[styles.tempRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View>
              <Text style={styles.temp}>{Math.round(weather.temperature_2m)}°C</Text>
              <Text style={styles.dateText}>{formatFullDate()}</Text>
              <Text style={styles.feelsLike}>Feels like {Math.round(weather.apparent_temperature)}°</Text>
            </View>
            <Text style={styles.weatherIcon}>{theme?.icon}</Text>
          </Animated.View>

          {/* Stats 2×2 grid */}
          <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
            <View style={styles.statsRow}>
              <StatCell icon="💧" label="Humidity" value={`${weather.relativehumidity_2m}%`} />
              <View style={styles.vertDivider} />
              <StatCell icon="☀️" label="UV Index" value={`${uvIndex}/10`} />
            </View>
            <View style={styles.horizDivider} />
            <View style={styles.statsRow}>
              <StatCell icon="🌧️" label="Rain" value={`${rainChance}%`} />
              <View style={styles.vertDivider} />
              <StatCell icon="💨" label="Wind" value={`${Math.round(weather.windspeed_10m)} km/h`} />
            </View>
          </Animated.View>

        </View>

        {/* ── White bottom sheet ── */}
        <View style={styles.bottomSheet}>

          {/* Today high / low pill */}
          <View style={styles.todayPill}>
            <Text style={styles.todayLabel}>Today</Text>
            <Text style={styles.todayHigh}> ↑{Math.round(todayHigh)}°</Text>
            <Text style={styles.todayLow}> ↓{Math.round(todayLow)}°</Text>
            <View style={styles.pillDivider} />
            <Text style={styles.todayLabel}>{theme?.label}</Text>
          </View>

          {/* Hourly forecast */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hourly Forecast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyScroll}>
              {hourly.map((h, i) => {
                const t = getTheme(h.code);
                return (
                  <View key={i} style={styles.hourlyItem}>
                    <Text style={styles.hourTime}>{formatHour(h.time)}</Text>
                    <View style={styles.hourIconCircle}>
                      <Text style={styles.hourIcon}>{t?.icon ?? '🌡️'}</Text>
                    </View>
                    <Text style={styles.hourTemp}>{Math.round(h.temp)}°</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* 5-day forecast */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {daily.map((d, i) => {
              const t = getTheme(d.code);
              return (
                <View key={i} style={[styles.dayRow, i < daily.length - 1 && styles.dayRowBorder]}>
                  <View style={styles.dayIconCircle}>
                    <Text style={styles.dayIcon}>{t?.icon ?? '🌡️'}</Text>
                  </View>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayLabel}>{formatDayLabel(d.date)}</Text>
                    <Text style={styles.dayCondition}>{t?.label}</Text>
                  </View>
                  <View style={styles.dayTemps}>
                    <Text style={styles.dayHigh}>↑{Math.round(d.high)}°</Text>
                    <Text style={styles.dayLow}>↓{Math.round(d.low)}°</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Precipitation map */}
          {coords && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Precipitation</Text>
              <Text style={styles.mapSubtitle}>Weather for {locationName}</Text>
              <WeatherMap lat={coords.lat} lon={coords.lon} />
            </View>
          )}

        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function StatCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center', marginTop: 300 },
  errorText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center', marginTop: 280, paddingHorizontal: 32 },
  retryBtn: { alignSelf: 'center', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },

  gradientSection: {
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  refreshIcon: { color: '#fff', fontSize: 22, fontWeight: '700' },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },

  alertBanner: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: { color: '#fff', fontSize: 13, fontWeight: '500' },

  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  temp: { fontSize: 80, fontWeight: '300', color: '#fff', lineHeight: 84, letterSpacing: -2 },
  dateText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  feelsLike: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  weatherIcon: { fontSize: 80 },

  statsGrid: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
  statIcon: { fontSize: 22 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 1 },
  vertDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.2)' },
  horizDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },

  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: 32,
    minHeight: 400,
  },

  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
  },
  todayLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  todayHigh: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  todayLow: { fontSize: 14, fontWeight: '700', color: '#0ea5e9' },
  pillDivider: { flex: 1 },

  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  mapSubtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 0 },

  hourlyScroll: { gap: 12, paddingRight: 4, paddingBottom: 4 },
  hourlyItem: { alignItems: 'center', gap: 8, width: 64 },
  hourTime: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  hourIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourIcon: { fontSize: 24 },
  hourTemp: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  dayRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dayIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIcon: { fontSize: 22 },
  dayInfo: { flex: 1 },
  dayLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  dayCondition: { fontSize: 12, color: '#64748b', marginTop: 2 },
  dayTemps: { flexDirection: 'row', gap: 8 },
  dayHigh: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  dayLow: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
});
