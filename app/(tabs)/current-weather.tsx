import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import LoadingScreen from '../../components/LoadingScreen';
import RainAnimation from '../../components/RainAnimation';
import { getTheme } from '../../constants/weatherThemes';
import { useSettings } from '../../contexts/SettingsContext';
import { usePalette } from '../../contexts/ThemeContext';
import { reverseGeocode } from '../../lib/geocoding';
import { formatTemperature, formatWindDirection, formatWindSpeed } from '../../lib/units';

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
        style: { width: '100%', height: '100%', border: 'none', borderRadius: 20 },
      })}
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: { height: 220, borderRadius: 20, overflow: 'hidden', marginTop: 12 },
});

interface CurrentWeather {
  temperature_2m: number;
  weathercode: number;
  windspeed_10m: number;
  winddirection_10m: number;
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
  const { unit, windFormat } = useSettings();
  const pal = usePalette();
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
        current: 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,precipitation',
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
    return <LoadingScreen message="Getting your weather…" />;
  }

  if (error || !weather) {
    return (
      <LinearGradient colors={['#1B55EE', '#3B75F8', '#96BAFF']} style={styles.screen}>
        <SafeAreaView style={styles.centerWrapper}>
          <Text style={styles.errorText}>{error || 'Could not load weather.'}</Text>
          <AnimatedPressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </AnimatedPressable>
        </SafeAreaView>
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

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* ── Gradient section ── */}
          <View style={styles.gradientSection}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerSubtitle}>CURRENT OUTLOOK</Text>
                <Text style={styles.headerTitle}>Weather Forecast</Text>
              </View>
              <AnimatedPressable style={styles.refreshBtn} onPress={load} scaleTo={0.85}>
                <Text style={styles.refreshIcon}>↻</Text>
              </AnimatedPressable>
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
                <Text style={styles.temp}>{formatTemperature(weather.temperature_2m, unit)}</Text>
                <Text style={styles.dateText}>{formatFullDate()}</Text>
                <Text style={styles.feelsLike}>Feels like {formatTemperature(weather.apparent_temperature, unit)}</Text>
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
                <StatCell
                  icon="💨"
                  label="Wind"
                  value={`${formatWindSpeed(weather.windspeed_10m, unit)} ${formatWindDirection(weather.winddirection_10m, windFormat)}`}
                />
              </View>
            </Animated.View>
          </View>

          {/* ── White bottom sheet ── */}
          <View style={[styles.bottomSheet, { backgroundColor: pal.surface }]}>
            {/* Today high / low pill */}
            <View style={[styles.todayPill, { backgroundColor: pal.background }]}>
              <Text style={[styles.todayLabel, { color: pal.textMuted }]}>Today</Text>
              <Text style={styles.todayHigh}> ↑{formatTemperature(todayHigh, unit)}</Text>
              <Text style={styles.todayLow}> ↓{formatTemperature(todayLow, unit)}</Text>
              <View style={styles.pillDivider} />
              <Text style={[styles.todayLabel, { color: pal.textMuted }]}>{theme?.label}</Text>
            </View>

            {/* Hourly forecast */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: pal.text }]}>Hourly Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyScroll}>
                {hourly.map((h, i) => {
                  const t = getTheme(h.code);
                  return (
                    <View key={i} style={styles.hourlyItem}>
                      <Text style={[styles.hourTime, { color: pal.textMuted }]}>{formatHour(h.time)}</Text>
                      <View style={[styles.hourIconCircle, { backgroundColor: pal.background }]}>
                        <Text style={styles.hourIcon}>{t?.icon ?? '🌡️'}</Text>
                      </View>
                      <Text style={[styles.hourTemp, { color: pal.text }]}>{formatTemperature(h.temp, unit)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* 5-day forecast */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: pal.text }]}>Upcoming Days</Text>
              {daily.map((d, i) => {
                const t = getTheme(d.code);
                return (
                  <View key={i} style={[styles.dayRow, i < daily.length - 1 && { borderBottomColor: pal.border }, styles.dayRowBorder]}>
                    <View style={[styles.dayIconCircle, { backgroundColor: pal.background }]}>
                      <Text style={styles.dayIcon}>{t?.icon ?? '🌡️'}</Text>
                    </View>
                    <View style={styles.dayInfo}>
                      <Text style={[styles.dayLabel, { color: pal.text }]}>{formatDayLabel(d.date)}</Text>
                      <Text style={[styles.dayCondition, { color: pal.textMuted }]}>{t?.label}</Text>
                    </View>
                    <View style={styles.dayTemps}>
                      <Text style={styles.dayHigh}>↑{formatTemperature(d.high, unit)}</Text>
                      <Text style={[styles.dayLow, { color: pal.textMuted }]}>↓{formatTemperature(d.low, unit)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Precipitation map */}
            {coords && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: pal.text }]}>Location Map</Text>
                <Text style={[styles.mapSubtitle, { color: pal.textMuted }]}>Weather station for {locationName}</Text>
                <WeatherMap lat={coords.lat} lon={coords.lon} />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <View style={styles.statIconCircle}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 20, paddingHorizontal: 28, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  gradientSection: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  headerSubtitle: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  refreshBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -2 },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  alertBanner: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  temp: { fontSize: 84, fontWeight: '200', color: '#fff', lineHeight: 88, letterSpacing: -3 },
  dateText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 4 },
  feelsLike: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  weatherIcon: { fontSize: 82 },

  statsGrid: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: { fontSize: 18 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 1 },
  vertDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.15)' },
  horizDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },

  bottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 40,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },

  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 4,
  },
  todayLabel: { fontSize: 14, fontWeight: '600' },
  todayHigh: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  todayLow: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
  pillDivider: { flex: 1 },

  section: { paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, letterSpacing: -0.2 },
  mapSubtitle: { fontSize: 12, marginBottom: 0 },

  hourlyScroll: { gap: 14, paddingRight: 4, paddingBottom: 4 },
  hourlyItem: { alignItems: 'center', gap: 8, width: 68 },
  hourTime: { fontSize: 11, fontWeight: '600' },
  hourIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  hourIcon: { fontSize: 24 },
  hourTemp: { fontSize: 14, fontWeight: '700' },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  dayRowBorder: { borderBottomWidth: 1.5 },
  dayIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dayIcon: { fontSize: 22 },
  dayInfo: { flex: 1 },
  dayLabel: { fontSize: 14, fontWeight: '700' },
  dayCondition: { fontSize: 12, marginTop: 2 },
  dayTemps: { flexDirection: 'row', gap: 8 },
  dayHigh: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  dayLow: { fontSize: 14, fontWeight: '600' },
});
