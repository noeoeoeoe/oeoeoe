import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { UNITS } from '@/constants/units';

/** A row of selectable unit chips. Tapping the selected chip clears it (null). */
export function UnitPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (unit: string | null) => void;
}) {
  return (
    <View style={styles.wrap}>
      {UNITS.map((u) => {
        const selected = value === u;
        return (
          <Pressable key={u} onPress={() => onChange(selected ? null : u)} hitSlop={4}>
            <ThemedView type={selected ? 'backgroundSelected' : 'background'} style={styles.chip}>
              <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                {u}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
});
