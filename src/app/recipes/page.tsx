'use client';

import { useState, useEffect } from 'react';
import RecipeCard from '@/components/RecipeCard';
import RecipeForm from '@/components/RecipeForm';
import RecipeModal from '@/components/RecipeModal';
import type { Recipe } from '@/types/recipe';
import { jsonldToRecipe } from '@/lib/recipeParser';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadRecipesFromDb();
  }, []);

  const loadRecipesFromDb = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
      setRecipes([]);
    }
  };

  const addRecipe = async (recipe: Recipe) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error adding recipe:', error);
    }
  };

  const removeRecipe = async (id: number) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error removing recipe:', error);
    }
  };

  const updateRecipe = async (recipeId: number, updates: {
    name?: string;
    servings?: string;
    instructions?: string;
    prepTime?: string;
    totalTime?: string;
    image?: string;
    ingredients?: string;
  }) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipeId, ...updates }),
      });

      if (response.ok) {
        await loadRecipesFromDb();
        // Update the selectedRecipe to reflect changes
        const updatedRecipes = await fetch('/api/recipes').then(r => r.json());
        const updatedRecipe = updatedRecipes.find((r: Recipe) => r.id === recipeId);
        if (updatedRecipe) {
          setSelectedRecipe(updatedRecipe);
        }
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <section className="recipes-section">
          <div className="section-header">
            <h2><i className="bi bi-plus-circle"></i> Aggiungi Nuova Ricetta</h2>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Cerca online, inserisci un URL o crea manualmente
          </p>

          <div className="section-content">
            <RecipeForm onAddRecipe={addRecipe}/>
          </div>
        </section>

        <section className="recipes-section">
          <div className="section-header">
            <h2><i className="bi bi-book"></i> Raccolta Ricette ({recipes.length})</h2>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Tutte le tue ricette salvate. Clicca per visualizzare dettagli o assegnale al piano settimanale.
          </p>

          <div className="recipes-grid">
            {recipes.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-book"></i>
                <p>Nessuna ricetta ancora</p>
                <span>Aggiungi la tua prima ricetta sopra!</span>
              </div>
            ) : (
              recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onRemove={removeRecipe}
                  onView={setSelectedRecipe}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onUpdateServings={(id, servings) => updateRecipe(id, { servings })}
          onUpdateRecipe={updateRecipe}
        />
      )}
    </div>
  );
}
