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
  const [libraryExpanded, setLibraryExpanded] = useState(true);

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

  const handleExtractRecipe = async (url: string) => {
    try {
      const response = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jsonld) {
          const recipe = jsonldToRecipe(data.jsonld);
          addRecipe(recipe);
        }
      }
    } catch (error) {
      console.error('Error extracting recipe:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📚 Le Mie Ricette</h1>
        <p>Gestisci la tua collezione di ricette</p>
      </div>

      <div className="page-content">
        <section className="recipes-section">
          <div className="section-header">
            <h2>
              <button
                className="collapse-btn"
                onClick={() => setLibraryExpanded(!libraryExpanded)}
              >
                <i className={`bi bi-chevron-${libraryExpanded ? 'down' : 'right'}`}></i>
              </button>
              Aggiungi Nuova Ricetta
            </h2>
          </div>

          {libraryExpanded && (
            <div className="section-content">
              <RecipeForm onAddRecipe={addRecipe} onExtractRecipe={handleExtractRecipe} />
            </div>
          )}
        </section>

        <section className="recipes-section">
          <div className="section-header">
            <h2>Raccolta Ricette ({recipes.length})</h2>
          </div>

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
          onUpdateServings={() => {}}
        />
      )}
    </div>
  );
}
