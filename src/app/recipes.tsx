import { useState } from 'react';

import { RecipeDetail } from '@/components/recipes/recipe-detail';
import { RecipeForm } from '@/components/recipes/recipe-form';
import { RecipeList } from '@/components/recipes/recipe-list';

/**
 * Recipes navigation, driven by local state (the custom tab router doesn't host
 * nested stacks): list → detail → form. List shows titles + a "+"; a recipe opens
 * its detail (ingredients), whose Edit button opens the form.
 */
export default function RecipesScreen() {
  const [view, setView] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (view === 'form') {
    return (
      <RecipeForm
        editingId={editingId}
        // Editing returns to the recipe's detail; creating returns to the list.
        onClose={() => setView(editingId ? 'detail' : 'list')}
      />
    );
  }

  if (view === 'detail' && selectedId) {
    return (
      <RecipeDetail
        id={selectedId}
        onBack={() => setView('list')}
        onEdit={() => {
          setEditingId(selectedId);
          setView('form');
        }}
      />
    );
  }

  return (
    <RecipeList
      onAdd={() => {
        setEditingId(null);
        setView('form');
      }}
      onSelect={(id) => {
        setSelectedId(id);
        setView('detail');
      }}
    />
  );
}
