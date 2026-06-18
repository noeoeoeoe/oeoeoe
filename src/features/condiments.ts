import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Condiment } from '@/types/db';

const KEY = ['condiments'];

/** Normalize an ingredient name so casing/whitespace don't split matches. */
export const normalizeName = (s: string) => s.trim().toLowerCase();

export function useCondiments() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Condiment[]> => {
      const { data, error } = await supabase.from('condiments').select('*');
      if (error) throw error;
      return data;
    },
  });
}

/** A Set of normalized condiment names for O(1) membership checks. */
export function useCondimentSet() {
  const { data } = useCondiments();
  return useMemo(() => new Set((data ?? []).map((c) => c.name)), [data]);
}

export function useToggleCondiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; on: boolean }) => {
      const name = normalizeName(input.name);
      if (!name) return;
      if (input.on) {
        const { error } = await supabase.from('condiments').insert({ name });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('condiments').delete().eq('name', name);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
