import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import { usePalette } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const router = useRouter();
  const pal = usePalette();

  async function handleLogin() {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: pal.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>⛅</Text>
          <Text style={[styles.title, { color: pal.text }]}>Weather Aware</Text>
          <Text style={[styles.subtitle, { color: pal.textMuted }]}>Know before the weather hits.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: pal.textMuted }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: pal.inputBg,
                  borderColor: focusedField === 'email' ? pal.primary : pal.border,
                  color: pal.text,
                },
              ]}
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#94a3b8"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: pal.textMuted }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: pal.inputBg,
                  borderColor: focusedField === 'password' ? pal.primary : pal.border,
                  color: pal.text,
                },
              ]}
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#94a3b8"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <AnimatedPressable
            style={[styles.button, { backgroundColor: pal.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </AnimatedPressable>
        </View>

        <AnimatedPressable onPress={() => router.push('/(auth)/register')} style={styles.footerLink}>
          <Text style={[styles.link, { color: pal.textMuted }]}>
            Don't have an account? <Text style={[styles.linkBold, { color: pal.primary }]}>Sign up</Text>
          </Text>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 24 },
  header: { alignItems: 'center', marginBottom: 8 },
  logo: { fontSize: 58, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 4 },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    gap: 20,
  },
  error: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 12, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  footerLink: { paddingVertical: 8, alignItems: 'center' },
  link: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
  linkBold: { fontWeight: '700' },
});
