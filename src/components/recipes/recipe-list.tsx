import { Pressable, StyleSheet } from 'react-native';

import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useRecipes } from '@/features/recipes';

/** Main Recipes screen: just the titles, big; tap one to open it, + to add. */
export function RecipeList({
  onAdd,
  onSelect,
}: {
  onAdd: () => void;
  onSelect: (id: string) => void;
}) {
  const { data: recipes, isLoading } = useRecipes();

  return (
    <Screen
      title="Recipes"
      headerRight={
        <Pressable onPress={onAdd} hitSlop={10} accessibilityLabel="New recipe">
          <ThemedText style={styles.plus}>+</ThemedText>
        </Pressable>
      }>
      {isLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
      {recipes?.length === 0 && (
        <ThemedText themeColor="textSecondary">No recipes yet. Tap + to add one.</ThemedText>
      )}

      {recipes?.map((r) => (
        <Pressable key={r.id} onPress={() => onSelect(r.id)} style={({ pressed }) => pressed && styles.pressed}>
          <Card>
            <Row>
              <ThemedText style={styles.title} numberOfLines={1}>
                {r.title}
              </ThemedText>
              <ThemedText style={styles.chevron} themeColor="textSecondary">
                ›
              </ThemedText>
            </Row>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  plus: { fontSize: 34, lineHeight: 38, fontWeight: '400' },
  pressed: { opacity: 0.6 },
  title: { flex: 1, fontSize: 26, fontWeight: '700' },
  chevron: { fontSize: 26, lineHeight: 28 },
});
