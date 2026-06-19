import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAddMeal, useDeleteMeal, useMeals } from '@/features/meals';
import { useDeleteWeight, useLogWeight, useWeightEntries } from '@/features/weight';
import { formatDay, formatTime, todayISODate } from '@/lib/date';
import { parseDecimal } from '@/lib/quantity';

/** Combined daily tracking: weight (one per day) + meals. */
export default function TrackScreen() {
  const theme = useTheme();

  // Weight
  const { data: entries, isLoading: weightLoading } = useWeightEntries();
  const logWeight = useLogWeight();
  const removeWeight = useDeleteWeight();
  const [weight, setWeight] = useState('');
  const latest = entries?.[0];
  const previous = entries?.[1];
  const delta = latest && previous ? latest.weight_kg - previous.weight_kg : null;

  // Meals
  const { data: meals, isLoading: mealsLoading } = useMeals();
  const addMeal = useAddMeal();
  const removeMeal = useDeleteMeal();
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');

  function submitWeight() {
    const kg = parseDecimal(weight);
    if (!kg || kg <= 0) return;
    logWeight.mutate(
      { weight_kg: kg, measured_on: todayISODate() },
      {
        onSuccess: () => setWeight(''),
        onError: (e) => Alert.alert('Could not log', String(e)),
      },
    );
  }

  function submitMeal() {
    const d = description.trim();
    if (!d) return;
    addMeal.mutate(
      { description: d, calories: calories ? parseDecimal(calories) : null, eaten_at: new Date().toISOString() },
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
    <Screen title="Track">
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        WEIGHT
      </ThemedText>
      <Card>
        <Row>
          <TextField
            style={{ flex: 1 }}
            placeholder="Today's weight (kg)"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Button title="Log" loading={logWeight.isPending} onPress={submitWeight} />
        </Row>
        {latest && (
          <ThemedText type="small" themeColor="textSecondary">
            Latest: {latest.weight_kg} kg
            {delta != null && ` · ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg vs. previous`}
          </ThemedText>
        )}
      </Card>

      {weightLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
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
            <Pressable onPress={() => removeWeight.mutate(w.id)} hitSlop={8}>
              <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </Row>
        </Card>
      ))}

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
        MEALS
      </ThemedText>
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
          <Button title="Log" loading={addMeal.isPending} onPress={submitMeal} />
        </Row>
      </Card>

      {mealsLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
      {meals?.length === 0 && (
        <ThemedText themeColor="textSecondary">No meals logged today.</ThemedText>
      )}
      {meals?.map((m) => (
        <Card key={m.id}>
          <Row>
            <ThemedText style={styles.mealDesc}>{m.description}</ThemedText>
            <Pressable onPress={() => removeMeal.mutate(m.id)} hitSlop={8}>
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
  section: { marginTop: 8, letterSpacing: 1 },
  value: { fontSize: 16, fontWeight: '600' },
  day: { flex: 1 },
  mealDesc: { flex: 1, fontSize: 16, fontWeight: '600' },
});
