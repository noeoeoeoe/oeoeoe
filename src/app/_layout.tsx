import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';

/**
 * Login is disabled for now (single user). Instead of showing a sign-in screen,
 * we auto-create an anonymous Supabase session so Row Level Security (auth.uid())
 * still scopes every row to this device's user. The session persists in storage,
 * so it's the same anonymous user across reloads.
 *
 * To re-enable email login later: import `SignIn` from '@/components/sign-in' and
 * render it instead of signing in anonymously when there's no session. To keep the
 * data you created anonymously, link an email to the anon user with
 * `supabase.auth.updateUser({ email })` rather than signing in fresh.
 */
function Gate() {
  const { session, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || session || attempted.current) return;
    attempted.current = true;
    supabase.auth.signInAnonymously().then(({ error }) => {
      if (error) setError(error.message);
    });
  }, [loading, session]);

  if (session) return <AppTabs />;

  return (
    <View style={styles.center}>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.hint}>
            Enable “Allow anonymous sign-ins” in Supabase → Authentication →
            Sign In / Providers, then reload.
          </Text>
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Gate />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  error: { textAlign: 'center', color: '#c0392b', fontWeight: '600' },
  hint: { textAlign: 'center', color: '#888' },
});
