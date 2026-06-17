import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAddMeal, useDeleteMeal, useMeals } from '@/features/meals';
import { formatDay, formatTime } from '@/lib/date';

export default function MealsScreen() {
  const theme = useTheme();
  const { data: meals, isLoading } = useMeals();
  const add = useAddMeal();
  const remove = useDeleteMeal();
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');

  function submit() {
    const d = description.trim();
    if (!d) return;
    add.mutate(
      {
        description: d,
        calories: calories ? Number(calories) : null,
        eaten_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setDescription('');
          setCalories('');
        },
        onError: (e) => Alert.alert('Could not log', String(e)),
      },
    );
  }

  return (
    <Screen title="Meals">
      <Card>
        <TextField placeholder="What did you eat?" value={description} onChangeText={setDescription} />
        <Row>
          <TextField
            style={{ flex: 1 }}
            placeholder="Calories (optional)"
            keyboardType="number-pad"
            value={calories}
            onChangeText={setCalories}
          />
          <Button title="Log" loading={add.isPending} onPress={submit} />
        </Row>
      </Card>

      {isLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
      {meals?.length === 0 && (
        <ThemedText themeColor="textSecondary">No meals logged today.</ThemedText>
      )}

      {meals?.map((m) => (
        <Card key={m.id}>
          <Row>
            <ThemedText style={styles.desc}>{m.description}</ThemedText>
            <Pressable onPress={() => remove.mutate(m.id)} hitSlop={8}>
              <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </Row>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDay(m.eaten_at)} {formatTime(m.eaten_at)}
            {m.calories ? ` · ${m.calories} kcal` : ''}
          </ThemedText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { flex: 1, fontSize: 16, fontWeight: '600' },
});
