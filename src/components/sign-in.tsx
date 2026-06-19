import type { ReactNode } from 'react';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './button';
import { Card } from './card';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Intent = 'signin' | 'link';

// Where Supabase sends the magic link back to. On web that's the current origin
// (works for both localhost dev and the deployed PWA); native uses the app scheme.
const redirectTo =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'oeoeoe://';

/**
 * Passwordless email **magic-link** auth (no SMTP / template changes needed —
 * works with Supabase's default emails). Adapts to the current session:
 *  - no session  → email me a link to sign in (or continue anonymously).
 *  - anonymous   → "Add email & sync" links an email to *this* account via
 *                  updateUser (data created here is preserved + becomes syncable),
 *                  or sign in to an account you already have.
 *  - email user  → shows the account + sign out.
 *
 * Clicking the link returns to the app; `detectSessionInUrl` (web) establishes the
 * session and `onAuthStateChange` updates the tree.
 */
export function SignIn({ onClose }: { onClose?: () => void }) {
  const { session } = useAuth();
  const user = session?.user;
  const isAnon = !!user?.is_anonymous;
  const currentEmail = user?.email ?? '';

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Already signed in with a real email → manage the account.
  if (user && !isAnon && currentEmail) {
    return (
      <Frame onClose={onClose}>
        <ThemedText type="title">Account</ThemedText>
        <ThemedText themeColor="textSecondary">Signed in as {currentEmail}.</ThemedText>
        <Card>
          <Button
            title="Sign out"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              await supabase.auth.signOut();
              setBusy(false);
              onClose?.();
            }}
          />
        </Card>
      </Frame>
    );
  }

  async function send(intent: Intent) {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    const { error } =
      intent === 'link'
        ? await supabase.auth.updateUser({ email: e }, { emailRedirectTo: redirectTo })
        : await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) return Alert.alert('Could not send link', error.message);
    setSentTo(e);
  }

  async function continueAnon() {
    setBusy(true);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) Alert.alert('Could not continue', error.message);
  }

  if (sentTo) {
    return (
      <Frame onClose={onClose}>
        <ThemedText type="title">Check your email</ThemedText>
        <ThemedText themeColor="textSecondary">
          We sent a sign-in link to {sentTo}. Open it to finish — it brings you right back here.
        </ThemedText>
        <Pressable onPress={() => setSentTo(null)} hitSlop={8}>
          <ThemedText type="link" themeColor="textSecondary">
            ← Use a different email
          </ThemedText>
        </Pressable>
      </Frame>
    );
  }

  return (
    <Frame onClose={onClose}>
      <ThemedText type="title">oeoeoe</ThemedText>
      <ThemedText themeColor="textSecondary">
        {isAnon
          ? 'Add your email to sync this data across devices — or sign in to an account you already have.'
          : 'Sign in with your email to sync across your devices.'}
      </ThemedText>

      <Card>
        <TextField
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        {isAnon ? (
          <>
            <Button title="Add email & sync" loading={busy} onPress={() => send('link')} />
            <Pressable onPress={() => send('signin')} hitSlop={8}>
              <ThemedText type="link" themeColor="textSecondary">
                I already have an account → sign in
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <Button title="Email me a link" loading={busy} onPress={() => send('signin')} />
            <Pressable onPress={continueAnon} hitSlop={8}>
              <ThemedText type="link" themeColor="textSecondary">
                Continue without an account
              </ThemedText>
            </Pressable>
          </>
        )}
      </Card>
    </Frame>
  );
}

function Frame({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.inner}>
          {onClose && (
            <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
              <ThemedText type="link" themeColor="textSecondary">
                Close
              </ThemedText>
            </Pressable>
          )}
          {children}
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
  close: { alignSelf: 'flex-end' },
});
