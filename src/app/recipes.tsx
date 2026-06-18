import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UnitPicker } from '@/components/unit-picker';
import { Spacing } from '@/constants/theme';
import { normalizeName, useCondimentSet, useToggleCondiment } from '@/features/condiments';
import { useAddIngredientsToErrands, type IngredientItem } from '@/features/errands';
import {
  totalCalories,
  useAddRecipe,
  useDeleteRecipe,
  useRecipes,
  useUpdateRecipe,
} from '@/features/recipes';
import { useTheme } from '@/hooks/use-theme';
import { formatQty } from '@/lib/quantity';
import type { Recipe, RecipeIngredient } from '@/types/db';

type DraftIngredient = { name: string; amount: string; unit: string | null; calories: string };

const emptyIngredient = (): DraftIngredient => ({ name: '', amount: '', unit: null, calories: '' });

/** Display label for an ingredient's quantity, scaled by the serving multiplier. */
function qtyLabel(ing: RecipeIngredient, mult: number): string {
  if (ing.amount != null) return formatQty(ing.amount * mult, ing.unit);
  return ing.quantity ?? ''; // legacy free-text rows aren't numeric, so they don't scale
}

export default function RecipesScreen() {
  const theme = useTheme();
  const { data: recipes, isLoading } = useRecipes();
  const add = useAddRecipe();
  const update = useUpdateRecipe();
  const remove = useDeleteRecipe();
  const addToErrands = useAddIngredientsToErrands();
  const condiments = useCondimentSet();
  const toggleCondiment = useToggleCondiment();

  const isCondiment = (name: string) => condiments.has(normalizeName(name));

  // Per-recipe serving multiplier (default 1) for the "make it N times" stepper.
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const multOf = (id: string) => multipliers[id] ?? 1;
  function setMult(id: string, next: number) {
    setMultipliers((prev) => ({ ...prev, [id]: Math.max(1, next) }));
  }

  /** Scale a recipe's ingredients into errand items, optionally keeping only condiments. */
  function itemsFor(recipe: Recipe, mult: number, only: 'buy' | 'condiments'): IngredientItem[] {
    return recipe.ingredients
      .filter((ing) => (only === 'condiments' ? isCondiment(ing.name) : !isCondiment(ing.name)))
      .map((ing) => ({
        name: ing.name,
        amount: ing.amount != null ? ing.amount * mult : null,
        unit: ing.unit ?? null,
      }));
  }

  function sendToErrands(recipe: Recipe) {
    const mult = multOf(recipe.id);
    const buy = itemsFor(recipe, mult, 'buy');
    const skipped = recipe.ingredients.filter((ing) => isCondiment(ing.name)).length;
    addToErrands.mutate(buy, {
      onSuccess: ({ merged, added }) => {
        const parts = [added && `${added} ajouté${added > 1 ? 's' : ''}`, merged && `${merged} fusionné${merged > 1 ? 's' : ''}`].filter(Boolean);
        const extra = skipped ? ` · ${skipped} condiment${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''}` : '';
        Alert.alert(
          'Ajouté aux courses',
          `"${recipe.title}"${mult > 1 ? ` ×${mult}` : ''} — ${parts.join(', ') || 'rien de neuf'}${extra}.`,
        );
      },
      onError: (e) => Alert.alert('Échec', String(e)),
    });
  }

  function includeCondiments(recipe: Recipe) {
    const items = itemsFor(recipe, multOf(recipe.id), 'condiments');
    if (items.length === 0) return;
    addToErrands.mutate(items, {
      onSuccess: ({ merged, added }) =>
        Alert.alert(
          'Condiments ajoutés',
          `${added} ajouté${added > 1 ? 's' : ''}, ${merged} fusionné${merged > 1 ? 's' : ''}.`,
        ),
      onError: (e) => Alert.alert('Échec', String(e)),
    });
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([emptyIngredient()]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setIngredients([emptyIngredient()]);
  }

  function startEdit(recipe: Recipe) {
    setEditingId(recipe.id);
    setTitle(recipe.title);
    setIngredients(
      recipe.ingredients.length
        ? recipe.ingredients.map((i) => ({
            name: i.name,
            amount: i.amount != null ? String(i.amount) : '',
            unit: i.unit ?? null,
            calories: i.calories != null ? String(i.calories) : '',
          }))
        : [emptyIngredient()],
    );
  }

  function updateIngredient<K extends keyof DraftIngredient>(
    index: number,
    field: K,
    value: DraftIngredient[K],
  ) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  }

  function addRow() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }

  function removeRow(index: number) {
    setIngredients((prev) =>
      prev.length === 1 ? [emptyIngredient()] : prev.filter((_, i) => i !== index),
    );
  }

  // Live total of whatever calories have been typed so far.
  const draftTotal = ingredients.reduce((sum, i) => sum + (i.calories ? Number(i.calories) : 0), 0);

  function submit() {
    const t = title.trim();
    if (!t) return;
    const cleaned: RecipeIngredient[] = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        amount: i.amount ? Number(i.amount) : null,
        unit: i.unit,
        calories: i.calories ? Number(i.calories) : null,
      }));
    if (cleaned.length === 0) {
      Alert.alert('Add an ingredient', 'A recipe needs at least one named ingredient.');
      return;
    }
    const handlers = {
      onSuccess: resetForm,
      onError: (e: unknown) => Alert.alert('Could not save', String(e)),
    };
    if (editingId) {
      update.mutate({ id: editingId, title: t, ingredients: cleaned }, handlers);
    } else {
      add.mutate({ title: t, ingredients: cleaned }, handlers);
    }
  }

  return (
    <Screen title="Recipes">
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

        <Row>
          {editingId && (
            <Pressable onPress={resetForm} hitSlop={8}>
              <ThemedText type="link" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
          )}
          <Button
            title={editingId ? 'Update recipe' : 'Save recipe'}
            loading={add.isPending || update.isPending}
            onPress={submit}
            style={{ flex: 1 }}
          />
        </Row>
      </Card>

      {isLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
      {recipes?.length === 0 && <ThemedText themeColor="textSecondary">No recipes yet.</ThemedText>}
      {!!recipes?.length && (
        <ThemedText type="small" themeColor="textSecondary">
          « C » = Condiment, ignoré dans « Add to errands ».
        </ThemedText>
      )}

      {recipes?.map((r) => {
        const mult = multOf(r.id);
        return (
          <Card key={r.id}>
            <Row>
              <ThemedText style={styles.recipeTitle}>{r.title}</ThemedText>
              <Pressable onPress={() => startEdit(r)} hitSlop={8}>
                <ThemedText type="link" themeColor="textSecondary">
                  Edit
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => remove.mutate(r.id)} hitSlop={8}>
                <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
              </Pressable>
            </Row>
            {r.ingredients.map((ing, i) => {
              const label = qtyLabel(ing, mult);
              const condiment = isCondiment(ing.name);
              return (
                <Row key={i} style={styles.ingredientLine}>
                  <ThemedText
                    type="small"
                    style={{ flex: 1 }}
                    themeColor={condiment ? 'textSecondary' : 'text'}>
                    {ing.name}
                    {label ? ` · ${label}` : ''}
                  </ThemedText>
                  {ing.calories != null && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {ing.calories * mult} kcal
                    </ThemedText>
                  )}
                  <Pressable
                    onPress={() => toggleCondiment.mutate({ name: ing.name, on: !condiment })}
                    hitSlop={8}
                    accessibilityLabel={condiment ? 'Retirer des condiments' : 'Marquer comme condiment'}>
                    <ThemedView
                      type={condiment ? 'backgroundSelected' : 'background'}
                      style={[styles.condimentBtn, { borderColor: theme.textSecondary }]}>
                      <ThemedText type="smallBold" themeColor={condiment ? 'text' : 'textSecondary'}>
                        C
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Row>
              );
            })}
            <Row style={styles.footer}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {totalCalories(r.ingredients) * mult} kcal total
              </ThemedText>
              <Row style={styles.stepper}>
                <Pressable onPress={() => setMult(r.id, mult - 1)} hitSlop={8}>
                  <ThemedText style={[styles.stepBtn, { color: theme.text }]}>−</ThemedText>
                </Pressable>
                <ThemedText type="smallBold" style={styles.stepValue}>
                  ×{mult}
                </ThemedText>
                <Pressable onPress={() => setMult(r.id, mult + 1)} hitSlop={8}>
                  <ThemedText style={[styles.stepBtn, { color: theme.text }]}>+</ThemedText>
                </Pressable>
              </Row>
            </Row>
            <Row style={styles.cardActions}>
              <Pressable
                onPress={() => sendToErrands(r)}
                hitSlop={8}
                disabled={addToErrands.isPending}>
                <ThemedText type="link" themeColor="textSecondary">
                  Add to errands
                </ThemedText>
              </Pressable>
              {r.ingredients.some((ing) => isCondiment(ing.name)) && (
                <Pressable
                  onPress={() => includeCondiments(r)}
                  hitSlop={8}
                  disabled={addToErrands.isPending}>
                  <ThemedText type="link" themeColor="textSecondary">
                    + condiments
                  </ThemedText>
                </Pressable>
              )}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  recipeTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  actions: { justifyContent: 'space-between' },
  ingredientLine: { justifyContent: 'space-between' },
  footer: { justifyContent: 'space-between' },
  cardActions: { gap: Spacing.four },
  condimentBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientEditor: { gap: Spacing.two },
  ingredientDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#8884',
    paddingTop: Spacing.two,
  },
  stepper: { gap: Spacing.three },
  stepBtn: { fontSize: 20, fontWeight: '600', width: 20, textAlign: 'center' },
  stepValue: { minWidth: 28, textAlign: 'center' },
});
