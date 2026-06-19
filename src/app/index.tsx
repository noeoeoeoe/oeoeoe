import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, Row } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { UnitPicker } from '@/components/unit-picker';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useAddErrand,
  useDeleteErrand,
  useErrands,
  useToggleErrand,
  useUpdateErrand,
} from '@/features/errands';
import { formatQty, parseDecimal } from '@/lib/quantity';
import type { Errand } from '@/types/db';

type Field = 'name' | 'quantity';

const errorAlert = (e: unknown) => Alert.alert('Could not save', String(e));

/** What to show for an errand's quantity: structured amount/unit, else legacy text. */
function quantityLabel(e: Errand): string {
  if (e.amount != null) return formatQty(e.amount, e.unit);
  return e.quantity ?? '';
}

export default function ErrandsScreen() {
  const theme = useTheme();
  const { data: errands, isLoading } = useErrands();
  const add = useAddErrand();
  const toggle = useToggleErrand();
  const update = useUpdateErrand();
  const remove = useDeleteErrand();
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<{ id: string; field: Field } | null>(null);
  const [editText, setEditText] = useState('');
  const [editUnit, setEditUnit] = useState<string | null>(null);

  function startEditName(e: Errand) {
    setEditing({ id: e.id, field: 'name' });
    setEditText(e.title);
  }

  function startEditQty(e: Errand) {
    setEditing({ id: e.id, field: 'quantity' });
    setEditText(e.amount != null ? String(e.amount) : '');
    setEditUnit(e.unit ?? null);
  }

  function saveEdit() {
    if (!editing) return;
    const e = errands?.find((x) => x.id === editing.id);
    if (!e) {
      setEditing(null);
      return;
    }
    if (editing.field === 'name') {
      const t = editText.trim();
      if (t && t !== e.title) {
        update.mutate({ id: e.id, title: t }, { onSuccess: () => setEditing(null), onError: errorAlert });
        return;
      }
      setEditing(null);
      return;
    }
    // Quantity: parse a number (blank → cleared). Setting a structured amount also
    // clears any legacy free-text quantity so the two don't disagree.
    const raw = editText.trim();
    const n = parseDecimal(raw);
    const amount = raw && !Number.isNaN(n) ? n : null;
    const unit = amount != null ? editUnit : null;
    update.mutate(
      { id: e.id, amount, unit, quantity: null },
      { onSuccess: () => setEditing(null), onError: errorAlert },
    );
  }

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

      {errands?.map((e) => {
        const isEditing = (field: Field) => editing?.id === e.id && editing.field === field;
        const strike = e.done && { textDecorationLine: 'line-through' as const };
        const label = quantityLabel(e);
        return (
          <Card key={e.id}>
            <Row>
              <Pressable onPress={() => toggle.mutate({ id: e.id, done: !e.done })} hitSlop={8}>
                <ThemedText style={styles.check}>{e.done ? '☑' : '☐'}</ThemedText>
              </Pressable>

              {isEditing('name') ? (
                <TextField
                  style={{ flex: 1 }}
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={saveEdit}
                  onBlur={saveEdit}
                  returnKeyType="done"
                  autoFocus
                />
              ) : (
                <Pressable style={styles.label} onPress={() => startEditName(e)}>
                  <ThemedText style={strike} themeColor={e.done ? 'textSecondary' : 'text'}>
                    {e.title}
                  </ThemedText>
                </Pressable>
              )}

              <Pressable onPress={() => startEditQty(e)} hitSlop={8}>
                <ThemedText
                  type="small"
                  themeColor={isEditing('quantity') ? 'text' : 'textSecondary'}
                  style={label ? strike : undefined}>
                  {label || '+ qty'}
                </ThemedText>
              </Pressable>

              <Pressable onPress={() => remove.mutate(e.id)} hitSlop={8}>
                <ThemedText style={{ color: theme.textSecondary }}>✕</ThemedText>
              </Pressable>
            </Row>

            {isEditing('quantity') && (
              <View style={styles.qtyEditor}>
                <Row>
                  <TextField
                    style={{ flex: 1 }}
                    placeholder="Amount"
                    keyboardType="numeric"
                    value={editText}
                    onChangeText={setEditText}
                    onSubmitEditing={saveEdit}
                    returnKeyType="done"
                    autoFocus
                  />
                  <Button title="Save" loading={update.isPending} onPress={saveEdit} />
                </Row>
                <UnitPicker value={editUnit} onChange={setEditUnit} />
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: { fontSize: 22, lineHeight: 24 },
  label: { flex: 1, fontSize: 16 },
  qtyEditor: { gap: Spacing.two },
});
