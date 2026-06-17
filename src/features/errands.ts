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
    mutationFn: async (input: { title: string; due_date?: string | null }) => {
      const { error } = await supabase
        .from('errands')
        .insert({ title: input.title, done: false, due_date: input.due_date ?? null });
      if (error) throw error;
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
