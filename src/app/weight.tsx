import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useDeleteWeight, useLogWeight, useWeightEntries } from '@/features/weight';
import { formatDay, todayISODate } from '@/lib/date';

export default function WeightScreen() {
  const theme = useTheme();
  const { data: entries, isLoading } = useWeightEntries();
  const log = useLogWeight();
  const remove = useDeleteWeight();
  const [weight, setWeight] = useState('');

  const latest = entries?.[0];
  const previous = entries?.[1];
  const delta = latest && previous ? latest.weight_kg - previous.weight_kg : null;

  function submit() {
    const kg = Number(weight);
    if (!kg || kg <= 0) return;
    log.mutate(
      { weight_kg: kg, measured_on: todayISODate() },
      {
        onSuccess: () => setWeight(''),
        onError: (e) => Alert.alert('Could not log', String(e)),
      },
    );
  }

  return (
    <Screen title="Weight">
      <Card>
        <Row>
          <TextField
            style={{ flex: 1 }}
            placeholder="Today's weight (kg)"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Button title="Log" loading={log.isPending} onPress={submit} />
        </Row>
        {latest && (
          <ThemedText type="small" themeColor="textSecondary">
            Latest: {latest.weight_kg} kg
            {delta != null && ` · ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg vs. previous`}
          </ThemedText>
        )}
      </Card>

      {isLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
      {entries?.length === 0 && (
        <ThemedText themeColor="textSecondary">No entries yet. Step on the scale.</ThemedText>
      )}

      {entries?.map((w) => (
        <Card key={w.id}>
          <Row>
            <ThemedText style={styles.value}>{w.weight_kg} kg</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.day}>
              {formatDay(w.measured_on)}
            </ThemedText>
            <Pressable onPress={() => remove.mutate(w.id)} hitSlop={8}>
              <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 16, fontWeight: '600' },
  day: { flex: 1 },
});
