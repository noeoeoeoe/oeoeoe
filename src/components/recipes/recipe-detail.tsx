import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';

import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { normalizeName, useCondimentSet, useToggleCondiment } from '@/features/condiments';
import { useAddIngredientsToErrands, type IngredientItem } from '@/features/errands';
import { totalCalories, useDeleteRecipe, useRecipes } from '@/features/recipes';
import { useTheme } from '@/hooks/use-theme';
import { formatQty } from '@/lib/quantity';
import type { Recipe, RecipeIngredient } from '@/types/db';

/** Quantity label scaled by the serving multiplier (legacy free-text rows don't scale). */
function qtyLabel(ing: RecipeIngredient, mult: number): string {
  if (ing.amount != null) return formatQty(ing.amount * mult, ing.unit);
  return ing.quantity ?? '';
}

export function RecipeDetail({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const { data: recipes, isLoading } = useRecipes();
  const remove = useDeleteRecipe();
  const addToErrands = useAddIngredientsToErrands();
  const condiments = useCondimentSet();
  const toggleCondiment = useToggleCondiment();

  const [mult, setMult] = useState(1);
  const recipe = recipes?.find((r) => r.id === id);

  const isCondiment = (name: string) => condiments.has(normalizeName(name));

  function itemsFor(r: Recipe, only: 'buy' | 'condiments'): IngredientItem[] {
    return r.ingredients
      .filter((ing) => (only === 'condiments' ? isCondiment(ing.name) : !isCondiment(ing.name)))
      .map((ing) => ({
        name: ing.name,
        amount: ing.amount != null ? ing.amount * mult : null,
        unit: ing.unit ?? null,
      }));
  }

  function sendToErrands(r: Recipe) {
    const buy = itemsFor(r, 'buy');
    const skipped = r.ingredients.filter((ing) => isCondiment(ing.name)).length;
    addToErrands.mutate(buy, {
      onSuccess: ({ merged, added }) => {
        const parts = [added && `${added} ajouté${added > 1 ? 's' : ''}`, merged && `${merged} fusionné${merged > 1 ? 's' : ''}`].filter(Boolean);
        const extra = skipped ? ` · ${skipped} condiment${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''}` : '';
        Alert.alert('Ajouté aux courses', `${parts.join(', ') || 'rien de neuf'}${mult > 1 ? ` (×${mult})` : ''}${extra}.`);
      },
      onError: (e) => Alert.alert('Échec', String(e)),
    });
  }

  function includeCondiments(r: Recipe) {
    const items = itemsFor(r, 'condiments');
    if (items.length === 0) return;
    addToErrands.mutate(items, {
      onSuccess: ({ merged, added }) =>
        Alert.alert('Condiments ajoutés', `${added} ajouté${added > 1 ? 's' : ''}, ${merged} fusionné${merged > 1 ? 's' : ''}.`),
      onError: (e) => Alert.alert('Échec', String(e)),
    });
  }

  function confirmDelete() {
    if (!recipe) return;
    const doDelete = () =>
      remove.mutate(recipe.id, { onSuccess: onBack, onError: (e) => Alert.alert('Échec', String(e)) });
    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer « ${recipe.title} » ?`)) doDelete();
    } else {
      Alert.alert('Supprimer la recette', `Supprimer « ${recipe.title} » ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  if (!recipe) {
    return (
      <Screen title="Recipe" onBack={onBack}>
        <ThemedText themeColor="textSecondary">{isLoading ? 'Loading…' : 'Recipe not found.'}</ThemedText>
      </Screen>
    );
  }

  const hasCondiments = recipe.ingredients.some((ing) => isCondiment(ing.name));

  return (
    <Screen
      title={recipe.title}
      onBack={onBack}
      headerRight={
        <Pressable onPress={onEdit} hitSlop={10}>
          <ThemedText type="link">Edit</ThemedText>
        </Pressable>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        « C » = Condiment, ignoré dans « Add to errands ».
      </ThemedText>

      <Card>
        {recipe.ingredients.map((ing, i) => {
          const label = qtyLabel(ing, mult);
          const condiment = isCondiment(ing.name);
          return (
            <Row key={i} style={styles.ingredientLine}>
              <ThemedText style={{ flex: 1 }} themeColor={condiment ? 'textSecondary' : 'text'}>
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
            {totalCalories(recipe.ingredients) * mult} kcal total
          </ThemedText>
          <Row style={styles.stepper}>
            <Pressable onPress={() => setMult(Math.max(1, mult - 1))} hitSlop={8}>
              <ThemedText style={[styles.stepBtn, { color: theme.text }]}>−</ThemedText>
            </Pressable>
            <ThemedText type="smallBold" style={styles.stepValue}>
              ×{mult}
            </ThemedText>
            <Pressable onPress={() => setMult(mult + 1)} hitSlop={8}>
              <ThemedText style={[styles.stepBtn, { color: theme.text }]}>+</ThemedText>
            </Pressable>
          </Row>
        </Row>

        <Row style={styles.cardActions}>
          <Pressable onPress={() => sendToErrands(recipe)} hitSlop={8} disabled={addToErrands.isPending}>
            <ThemedText type="link" themeColor="textSecondary">
              Add to errands
            </ThemedText>
          </Pressable>
          {hasCondiments && (
            <Pressable onPress={() => includeCondiments(recipe)} hitSlop={8} disabled={addToErrands.isPending}>
              <ThemedText type="link" themeColor="textSecondary">
                + condiments
              </ThemedText>
            </Pressable>
          )}
        </Row>
      </Card>

      {(recipe.instructions ?? []).length > 0 && (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
            INSTRUCTIONS
          </ThemedText>
          {recipe.instructions.map((step, i) => (
            <Row key={i} style={styles.stepRow}>
              <ThemedText type="smallBold" style={styles.stepNum}>
                {i + 1}.
              </ThemedText>
              <ThemedText style={{ flex: 1 }}>{step}</ThemedText>
            </Row>
          ))}
        </Card>
      )}

      <Pressable onPress={confirmDelete} hitSlop={8} style={styles.delete}>
        <ThemedText type="link" themeColor="textSecondary">
          Supprimer la recette
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  stepper: { gap: Spacing.three },
  stepBtn: { fontSize: 20, fontWeight: '600', width: 20, textAlign: 'center' },
  stepValue: { minWidth: 28, textAlign: 'center' },
  delete: { alignSelf: 'center' },
  section: { letterSpacing: 1 },
  stepRow: { alignItems: 'flex-start' },
  stepNum: { minWidth: 18 },
});
