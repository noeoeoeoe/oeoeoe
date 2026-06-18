import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Errand } from '@/types/db';

const KEY = ['errands'];

export function useErrands() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Errand[]> => {
      const { data, error } = await supabase
        .from('errands')
        .select('*')
        .order('done', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddErrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      amount?: number | null;
      unit?: string | null;
      due_date?: string | null;
    }) => {
      const { error } = await supabase.from('errands').insert({
        title: input.title,
        amount: input.amount ?? null,
        unit: input.unit ?? null,
        quantity: null,
        done: false,
        due_date: input.due_date ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export type IngredientItem = { name: string; amount: number | null; unit: string | null };

/** Merge key: same ingredient name + same unit can have their amounts summed. */
const mergeKey = (name: string, unit: string | null) =>
  `${name.trim().toLowerCase()}|${(unit ?? '').trim().toLowerCase()}`;

/**
 * Add a recipe's ingredients to the errands list, merging into existing open
 * (un-done) errands: same name + unit → sum amounts; otherwise add a new line.
 * Returns how many were merged vs newly added.
 */
export function useAddIngredientsToErrands() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: IngredientItem[]): Promise<{ merged: number; added: number }> => {
      if (items.length === 0) return { merged: 0, added: 0 };

      const { data: open, error: readErr } = await supabase
        .from('errands')
        .select('*')
        .eq('done', false);
      if (readErr) throw readErr;

      // Existing open errands, keyed for merge. Mutating `amount` here lets several
      // incoming items targeting the same row accumulate before we write.
      const existing = new Map<string, { id: string; amount: number | null }>();
      for (const e of open ?? []) existing.set(mergeKey(e.title, e.unit), { id: e.id, amount: e.amount });

      const updates = new Map<string, number>(); // id -> summed amount
      const inserts: {
        title: string;
        amount: number | null;
        unit: string | null;
        quantity: null;
        done: boolean;
        due_date: null;
      }[] = [];
      const insertByKey = new Map<string, number>(); // key -> index into `inserts`

      for (const it of items) {
        const k = mergeKey(it.name, it.unit);
        const match = existing.get(k);

        if (match && match.amount != null && it.amount != null) {
          const summed = (match.amount = match.amount + it.amount);
          updates.set(match.id, summed);
          continue;
        }
        if (match && match.amount == null && it.amount == null) {
          continue; // countless item already on the list — don't duplicate
        }

        const pending = insertByKey.get(k);
        if (pending != null && it.amount != null && inserts[pending].amount != null) {
          inserts[pending].amount = (inserts[pending].amount as number) + it.amount;
          continue;
        }
        inserts.push({
          title: it.name.trim(),
          amount: it.amount,
          unit: it.unit,
          quantity: null,
          done: false,
          due_date: null,
        });
        if (it.amount != null) insertByKey.set(k, inserts.length - 1);
      }

      await Promise.all(
        [...updates.entries()].map(([id, amount]) =>
          supabase
            .from('errands')
            .update({ amount })
            .eq('id', id)
            .then(({ error }) => {
              if (error) throw error;
            }),
        ),
      );
      if (inserts.length) {
        const { error } = await supabase.from('errands').insert(inserts);
        if (error) throw error;
      }
      return { merged: updates.size, added: inserts.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleErrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('errands')
        .update({ done: input.done })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateErrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      amount?: number | null;
      unit?: string | null;
      quantity?: string | null;
    }) => {
      const patch: { title?: string; amount?: number | null; unit?: string | null; quantity?: string | null } = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.amount !== undefined) patch.amount = input.amount;
      if (input.unit !== undefined) patch.unit = input.unit;
      if (input.quantity !== undefined) patch.quantity = input.quantity;
      const { error } = await supabase.from('errands').update(patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteErrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('errands').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
