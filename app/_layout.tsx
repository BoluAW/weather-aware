import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { SettingsProvider } from '../contexts/SettingsContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { registerForPushNotifications, savePushToken } from '../lib/notifications';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    (async () => {
      const hasSeenOnboarding = (await AsyncStorage.getItem('has_seen_onboarding')) === 'true';
      const inAuthGroup = segments[0] === '(auth)';
      const onOnboarding = segments[1] === 'onboarding';

      if (!session) {
        if (!hasSeenOnboarding && !onOnboarding) {
          router.replace('/(auth)/onboarding');
        } else if (hasSeenOnboarding && !inAuthGroup) {
          router.replace('/(auth)/login');
        }
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)');
        registerForPushNotifications().then((token) => {
          if (token) savePushToken(token);
        });
      }
    })();
  }, [session, loading, segments]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <SettingsProvider>
        <Slot />
      </SettingsProvider>
    </ThemeProvider>
  );
}
