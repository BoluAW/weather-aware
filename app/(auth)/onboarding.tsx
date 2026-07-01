import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';

export default function OnboardingScreen() {
  const router = useRouter();

  async function handleGetStarted() {
    await AsyncStorage.setItem('has_seen_onboarding', 'true');
    router.replace('/(auth)/login');
  }

  return (
    <LinearGradient colors={['#101827', '#1e293b', '#0f172a']} style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.illustration}>
            <View style={styles.glassContainer}>
              <Text style={styles.illustrationIcon}>⛅</Text>
              <Text style={styles.glowText}>Weather Aware</Text>
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Plan Smart.{'\n'}
              <Text style={styles.highlight}>Live Aware.</Text>
            </Text>

            <Text style={styles.description}>
              Receive timely, custom weather alerts tailored specifically to your plans, workouts, laundry, or trips. Never get caught off guard again.
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <AnimatedPressable style={styles.button} onPress={handleGetStarted} scaleTo={0.96}>
              <Text style={styles.buttonText}>Get Started   →</Text>
            </AnimatedPressable>

            <Text style={styles.terms}>
              By clicking Get Started, you confirm that you have read and agree to our{' '}
              <Text style={styles.termsBold}>Terms of Use</Text> and{' '}
              <Text style={styles.termsBold}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, justifyContent: 'center' },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
  },
  illustration: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    width: 240,
    height: 240,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  illustrationIcon: { fontSize: 90 },
  glowText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textContainer: {
    marginVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  highlight: {
    color: '#3B82F6',
  },
  description: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 12,
  },
  actionContainer: {
    gap: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  terms: { fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 16 },
  termsBold: { color: '#94a3b8', fontWeight: '600' },
});
