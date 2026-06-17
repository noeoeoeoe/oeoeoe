import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Meal } from '@/types/db';

const KEY = ['meals'];

export function useMeals() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('eaten_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      description: string;
      calories?: number | null;
      eaten_at: string;
    }) => {
      const { error } = await supabase.from('meals').insert({
        description: input.description,
        calories: input.calories ?? null,
        eaten_at: input.eaten_at,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
