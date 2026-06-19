import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import '@/lib/pwa-meta'; // web: injects PWA / home-screen <head> tags (no-op on native)

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SignIn } from '@/components/sign-in';
import { AccountProvider } from '@/lib/account';
import { AuthProvider, useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/query';

/**
 * Auth gate. While the session restores from storage we show a spinner. With no
 * session we render the email-OTP `SignIn` screen (which also offers "continue
 * without an account" → anonymous). Once there's a session — anonymous or
 * email — we render the app, wrapped so any screen can open the account sheet
 * (e.g. an anonymous user linking an email to sync, via `supabase.auth.updateUser`).
 */
function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) return <SignIn />;

  return (
    <AccountProvider>
      <AppTabs />
    </AccountProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <AnimatedSplashOverlay />
          <Gate />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
});
