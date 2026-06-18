import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Recipe, RecipeIngredient } from '@/types/db';

const KEY = ['recipes'];

export function useRecipes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Recipe[]> => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; ingredients: RecipeIngredient[] }) => {
      const { error } = await supabase.from('recipes').insert({
        title: input.title,
        ingredients: input.ingredients,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; title: string; ingredients: RecipeIngredient[] }) => {
      const { error } = await supabase
        .from('recipes')
        .update({ title: input.title, ingredients: input.ingredients })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Sum of the per-ingredient calories, ignoring ingredients with none recorded. */
export function totalCalories(ingredients: RecipeIngredient[]): number {
  return ingredients.reduce((sum, i) => sum + (i.calories ?? 0), 0);
}
