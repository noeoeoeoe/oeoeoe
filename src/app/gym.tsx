import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAddWorkout, useDeleteWorkout, useWorkouts } from '@/features/gym';
import { formatDay } from '@/lib/date';

export default function GymScreen() {
  const theme = useTheme();
  const { data: workouts, isLoading } = useWorkouts();
  const add = useAddWorkout();
  const remove = useDeleteWorkout();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');

  function submit() {
    const n = name.trim();
    if (!n) return;
    add.mutate(
      {
        name: n,
        performed_at: new Date().toISOString(),
        duration_min: duration ? Number(duration) : null,
      },
      {
        onSuccess: () => {
          setName('');
          setDuration('');
        },
        onError: (e) => Alert.alert('Could not log', String(e)),
      },
    );
  }

  return (
    <Screen title="Gym">
      <Card>
        <TextField placeholder="Session (e.g. Push day, 5k run)" value={name} onChangeText={setName} />
        <Row>
          <TextField
            style={{ flex: 1 }}
            placeholder="Minutes (optional)"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />
          <Button title="Log" loading={add.isPending} onPress={submit} />
        </Row>
      </Card>

      {isLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
      {workouts?.length === 0 && (
        <ThemedText themeColor="textSecondary">No sessions yet. Go lift something.</ThemedText>
      )}

      {workouts?.map((w) => (
        <Card key={w.id}>
          <Row>
            <ThemedText style={styles.name}>{w.name}</ThemedText>
            <Pressable onPress={() => remove.mutate(w.id)} hitSlop={8}>
              <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </Row>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDay(w.performed_at)}
            {w.duration_min ? ` · ${w.duration_min} min` : ''}
          </ThemedText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
});
