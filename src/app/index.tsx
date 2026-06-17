import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAddErrand, useDeleteErrand, useErrands, useToggleErrand } from '@/features/errands';

export default function ErrandsScreen() {
  const theme = useTheme();
  const { data: errands, isLoading } = useErrands();
  const add = useAddErrand();
  const toggle = useToggleErrand();
  const remove = useDeleteErrand();
  const [title, setTitle] = useState('');

  function submit() {
    const t = title.trim();
    if (!t) return;
    add.mutate(
      { title: t },
      {
        onSuccess: () => setTitle(''),
        onError: (e) => Alert.alert('Could not add', String(e)),
      },
    );
  }

  return (
    <Screen title="Errands">
      <Card>
        <Row>
          <TextField
            style={{ flex: 1 }}
            placeholder="Add an errand…"
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <Button title="Add" loading={add.isPending} onPress={submit} />
        </Row>
      </Card>

      {isLoading && <ThemedText themeColor="textSecondary">Loading…</ThemedText>}
      {errands?.length === 0 && (
        <ThemedText themeColor="textSecondary">Nothing to do. Nice.</ThemedText>
      )}

      {errands?.map((e) => (
        <Card key={e.id}>
          <Row>
            <Pressable onPress={() => toggle.mutate({ id: e.id, done: !e.done })} hitSlop={8}>
              <ThemedText style={styles.check}>{e.done ? '☑' : '☐'}</ThemedText>
            </Pressable>
            <ThemedText
              style={[styles.label, e.done && { textDecorationLine: 'line-through' }]}
              themeColor={e.done ? 'textSecondary' : 'text'}>
              {e.title}
            </ThemedText>
            <Pressable onPress={() => remove.mutate(e.id)} hitSlop={8}>
              <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
            </Pressable>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: { fontSize: 22, lineHeight: 24 },
  label: { flex: 1, fontSize: 16 },
});
