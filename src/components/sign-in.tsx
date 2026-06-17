import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './button';
import { Card } from './card';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * Passwordless email OTP sign-in. The same email signs you in on every device,
 * which is what makes data sync across them. Enter email → receive a 6-digit
 * code → enter it. No passwords to manage.
 */
export function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) return Alert.alert('Could not send code', error.message);
    setStage('code');
  }

  async function verify() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) Alert.alert('Invalid code', error.message);
    // On success, onAuthStateChange swaps this screen for the app.
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.inner}>
          <ThemedText type="title">Daily</ThemedText>
          <ThemedText themeColor="textSecondary">
            Sign in with your email to sync across your devices.
          </ThemedText>

          <Card>
            {stage === 'email' ? (
              <>
                <TextField
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
                <Button title="Send code" loading={busy} onPress={sendCode} />
              </>
            ) : (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Enter the code sent to {email}
                </ThemedText>
                <TextField
                  placeholder="123456"
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                />
                <Button title="Verify & sign in" loading={busy} onPress={verify} />
              </>
            )}
          </Card>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
});
