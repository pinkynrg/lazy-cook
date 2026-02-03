'use client';

import type { Recipe } from '@/types/recipe';
import RecipeCard from '@/components/RecipeCard/RecipeCard';
import styles from './RecipeList.module.scss';

interface RecipeListProps {
  recipes: Recipe[];
  onViewRecipe: (recipe: Recipe) => void;
  onRemoveRecipe: (id: number) => void;
}

export default function RecipeList({ recipes, onViewRecipe, onRemoveRecipe }: RecipeListProps) {
  console.log('RecipeList recipes:', recipes.map(r => ({ name: r.name, hasImage: !!r.image, image: r.image })));
  
  if (recipes.length === 0) {
    return (
      <div className="recipes-grid">
        <p className="empty-state">Nessuna ricetta aggiunta. Inizia aggiungendo una ricetta!</p>
      </div>
    );
  }

  return (
    <div className="recipes-grid">
      {recipes.map(recipe => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onView={onViewRecipe}
          onRemove={onRemoveRecipe}
        />
      ))}
    </div>
  );
}
