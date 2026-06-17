import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { WeightEntry } from '@/types/db';

const KEY = ['weight'];

export function useWeightEntries() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<WeightEntry[]> => {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .order('measured_on', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Upsert by (user_id, measured_on): logging twice in a day overwrites that day's
 * value rather than creating duplicates. Relies on the unique constraint in schema.sql.
 */
export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { weight_kg: number; measured_on: string }) => {
      const { error } = await supabase
        .from('weight_entries')
        .upsert(
          { weight_kg: input.weight_kg, measured_on: input.measured_on },
          { onConflict: 'user_id,measured_on' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('weight_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
