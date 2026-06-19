import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { UnitPicker } from '@/components/unit-picker';
import { Spacing } from '@/constants/theme';
import { useAddRecipe, useRecipes, useUpdateRecipe } from '@/features/recipes';
import { useTheme } from '@/hooks/use-theme';
import { parseDecimal } from '@/lib/quantity';
import type { RecipeIngredient } from '@/types/db';

type DraftIngredient = { name: string; amount: string; unit: string | null; calories: string };

const emptyIngredient = (): DraftIngredient => ({ name: '', amount: '', unit: null, calories: '' });

export function RecipeForm({ editingId, onClose }: { editingId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const { data: recipes } = useRecipes();
  const add = useAddRecipe();
  const update = useUpdateRecipe();

  // Prefill from the cached recipe when editing (set once at mount).
  const editing = editingId ? recipes?.find((r) => r.id === editingId) ?? null : null;
  const [title, setTitle] = useState(editing?.title ?? '');
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(() =>
    editing && editing.ingredients.length
      ? editing.ingredients.map((i) => ({
          name: i.name,
          amount: i.amount != null ? String(i.amount) : '',
          unit: i.unit ?? null,
          calories: i.calories != null ? String(i.calories) : '',
        }))
      : [emptyIngredient()],
  );
  const [instructions, setInstructions] = useState<string[]>(() => editing?.instructions ?? []);

  function updateStep(index: number, value: string) {
    setInstructions((prev) => prev.map((s, i) => (i === index ? value : s)));
  }
  function addStep() {
    setInstructions((prev) => [...prev, '']);
  }
  function removeStep(index: number) {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIngredient<K extends keyof DraftIngredient>(index: number, field: K, value: DraftIngredient[K]) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  }
  function addRow() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }
  function removeRow(index: number) {
    setIngredients((prev) => (prev.length === 1 ? [emptyIngredient()] : prev.filter((_, i) => i !== index)));
  }

  const draftTotal = ingredients.reduce((sum, i) => sum + (i.calories ? parseDecimal(i.calories) : 0), 0);

  function submit() {
    const t = title.trim();
    if (!t) return;
    const cleaned: RecipeIngredient[] = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        amount: i.amount ? parseDecimal(i.amount) : null,
        unit: i.unit,
        calories: i.calories ? parseDecimal(i.calories) : null,
      }));
    if (cleaned.length === 0) {
      Alert.alert('Add an ingredient', 'A recipe needs at least one named ingredient.');
      return;
    }
    const steps = instructions.map((s) => s.trim()).filter(Boolean);
    const handlers = { onSuccess: onClose, onError: (e: unknown) => Alert.alert('Could not save', String(e)) };
    if (editingId) {
      update.mutate({ id: editingId, title: t, ingredients: cleaned, instructions: steps }, handlers);
    } else {
      add.mutate({ title: t, ingredients: cleaned, instructions: steps }, handlers);
    }
  }

  return (
    <Screen title={editingId ? 'Edit recipe' : 'New recipe'} onBack={onClose}>
      <Card>
        <TextField placeholder="Recipe title" value={title} onChangeText={setTitle} />

        {ingredients.map((ing, i) => (
          <View key={i} style={[styles.ingredientEditor, i > 0 && styles.ingredientDivider]}>
            <Row>
              <TextField
                style={{ flex: 1 }}
                placeholder="Ingredient"
                value={ing.name}
                onChangeText={(v) => updateIngredient(i, 'name', v)}
              />
              <Pressable onPress={() => removeRow(i)} hitSlop={8}>
                <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
              </Pressable>
            </Row>
            <Row>
              <TextField
                style={{ flex: 1 }}
                placeholder="Amount"
                keyboardType="numeric"
                value={ing.amount}
                onChangeText={(v) => updateIngredient(i, 'amount', v)}
              />
              <TextField
                style={{ flex: 1 }}
                placeholder="kcal"
                keyboardType="number-pad"
                value={ing.calories}
                onChangeText={(v) => updateIngredient(i, 'calories', v)}
              />
            </Row>
            <UnitPicker value={ing.unit} onChange={(u) => updateIngredient(i, 'unit', u)} />
          </View>
        ))}

        <Row style={styles.actions}>
          <Pressable onPress={addRow} hitSlop={8}>
            <ThemedText type="link" themeColor="textSecondary">
              + Add ingredient
            </ThemedText>
          </Pressable>
          {draftTotal > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {draftTotal} kcal total
            </ThemedText>
          )}
        </Row>
      </Card>

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
          INSTRUCTIONS
        </ThemedText>
        {instructions.map((step, i) => (
          <Row key={i} style={styles.stepRow}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.stepNum}>
              {i + 1}.
            </ThemedText>
            <TextField
              style={{ flex: 1 }}
              placeholder="Step…"
              multiline
              value={step}
              onChangeText={(v) => updateStep(i, v)}
            />
            <Pressable onPress={() => removeStep(i)} hitSlop={8} style={styles.stepRemove}>
              <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </Row>
        ))}
        <Pressable onPress={addStep} hitSlop={8}>
          <ThemedText type="link" themeColor="textSecondary">
            + Add step
          </ThemedText>
        </Pressable>
      </Card>

      <Button
        title={editingId ? 'Update recipe' : 'Save recipe'}
        loading={add.isPending || update.isPending}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { justifyContent: 'space-between' },
  ingredientEditor: { gap: Spacing.two },
  ingredientDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#8884',
    paddingTop: Spacing.two,
  },
  section: { letterSpacing: 1 },
  stepRow: { alignItems: 'flex-start' },
  stepNum: { minWidth: 18, paddingTop: Spacing.two },
  stepRemove: { paddingTop: Spacing.two },
});
