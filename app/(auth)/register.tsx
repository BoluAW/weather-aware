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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);
  const router = useRouter();
  const pal = usePalette();

  async function handleRegister() {
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.user) {
        await supabase.from('users').insert({ id: data.user.id, email, name });
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: pal.background }]}>
        <View style={styles.inner}>
          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
            <Text style={styles.logo}>✉️</Text>
            <Text style={[styles.title, { color: pal.text }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: pal.textMuted }]}>
              We sent a confirmation link to <Text style={styles.emailHighlight}>{email}</Text>. Click it then come back to sign in.
            </Text>
            <AnimatedPressable style={[styles.button, { backgroundColor: pal.primary }]} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Go to Sign In</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: pal.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>⛅</Text>
          <Text style={[styles.title, { color: pal.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: pal.textMuted }]}>Start planning weather-aware.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.border }, pal.cardShadow]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: pal.textMuted }]}>Full name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: pal.inputBg,
                  borderColor: focusedField === 'name' ? pal.primary : pal.border,
                  color: pal.text,
                },
              ]}
              placeholder="Alex Johnson"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#94a3b8"
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

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
              placeholder="Min. 6 characters"
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
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Sign Up'}</Text>
          </AnimatedPressable>
        </View>

        <AnimatedPressable onPress={() => router.back()} style={styles.footerLink}>
          <Text style={[styles.link, { color: pal.textMuted }]}>
            Already have an account? <Text style={[styles.linkBold, { color: pal.primary }]}>Sign in</Text>
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
    gap: 18,
  },
  emailHighlight: { fontWeight: '700', color: '#3B82F6' },
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
