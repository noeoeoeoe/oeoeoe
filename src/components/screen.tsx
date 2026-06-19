import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  title: string;
  children: ReactNode;
  /** Optional action rendered on the same row as the title, right-aligned. */
  headerRight?: ReactNode;
  /** When set, shows a back link above the title. */
  onBack?: () => void;
};

/** A themed, scrollable screen with a title that clears the native tab bar. */
export function Screen({ title, children, headerRight, onBack }: ScreenProps) {
  const safe = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          // Web floats the tab bar at the top, so clear its height; native pads
          // for the status bar only (its tab bar sits at the bottom).
          paddingTop: Platform.select({
            // Clear the floating web header (app name + Account) + tab bar.
            web: Spacing.six + Spacing.four + Spacing.four,
            default: safe.top + Spacing.three,
          }),
          paddingBottom: safe.bottom + BottomTabInset + Spacing.four,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      // Keep focused inputs above the on-screen keyboard (iOS) and let a downward
      // swipe dismiss it — both no-ops on web/Android.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.inner}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
            <ThemedText type="link" themeColor="textSecondary">
              ‹ Back
            </ThemedText>
          </Pressable>
        )}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
          {headerRight}
        </View>
        {children}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  back: { alignSelf: 'flex-start' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
});
