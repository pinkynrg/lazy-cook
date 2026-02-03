'use client';

import { useState, useEffect } from 'react';
import RecipeModal from '@/components/RecipeModal';
import WeeklyPlanner from '@/components/WeeklyPlanner';
import type { Recipe, Settings } from '@/types/recipe';

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [enableBreakfast, setEnableBreakfast] = useState(false);
  const [enableLunch, setEnableLunch] = useState(true);
  const [enableDinner, setEnableDinner] = useState(true);
  const [familySize, setFamilySize] = useState(2);

  useEffect(() => {
    loadRecipesFromDb();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data: Settings = await response.json();
        setEnableBreakfast(data.enableBreakfast);
        setEnableLunch(data.enableLunch);
        setEnableDinner(data.enableDinner);
        setFamilySize(data.familySize || 2);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

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

  const updateRecipeServings = async (id: number, servings: string) => {
    try {
      const response = await fetch('/api/recipes/update-servings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, servings: parseInt(servings) }),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error updating servings:', error);
    }
  };

  const updateRecipeDay = async (id: number, day: number | null) => {
    try {
      const response = await fetch('/api/recipes/update-day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, dayOfWeek: day }),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error updating recipe day:', error);
    }
  };

  const clearWeek = async () => {
    if (!confirm('Vuoi davvero svuotare tutta la settimana?')) return;

    try {
      const response = await fetch('/api/recipe-assignments/clear-all', {
        method: 'POST',
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error clearing week:', error);
    }
  };

  const addRecipeAssignment = async (recipeId: number, day: number, meal: 'breakfast' | 'lunch' | 'dinner', servings?: number) => {
    try {
      const response = await fetch('/api/recipe-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, dayOfWeek: day, mealType: meal, plannedServings: servings || familySize }),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error adding recipe assignment:', error);
    }
  };

  const removeRecipeAssignment = async (assignmentId: number) => {
    try {
      const response = await fetch('/api/recipe-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error removing recipe assignment:', error);
    }
  };

  const updateAssignmentServings = async (assignmentId: number, servings: number) => {
    try {
      const response = await fetch('/api/recipe-assignments/update-servings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId, servings }),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error updating assignment servings:', error);
    }
  };

  const moveAssignment = async (assignmentId: number, newDay: number, newMeal: 'breakfast' | 'lunch' | 'dinner') => {
    try {
      const response = await fetch('/api/recipe-assignments/update-day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, dayOfWeek: newDay, mealType: newMeal }),
      });

      if (response.ok) {
        loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error moving assignment:', error);
    }
  };

  return (
    <div className="app-container">
      <main className="main-container">
        <div className="page-header">
          <h1>📅 Piano Pasti Settimanale</h1>
          <p>Organizza i tuoi pasti per la settimana</p>
        </div>

        <WeeklyPlanner 
          recipes={recipes} 
          onUpdateDay={updateRecipeDay}
          onViewRecipe={setSelectedRecipe}
          onRemoveRecipe={removeRecipe}
          onUpdateServings={updateRecipeServings}
          onAddAssignment={addRecipeAssignment}
          onRemoveAssignment={removeRecipeAssignment}
          onUpdateAssignmentServings={updateAssignmentServings}
          onMoveAssignment={moveAssignment}
          onAddRecipe={addRecipe}
          onClearWeek={clearWeek}
          enableBreakfast={enableBreakfast}
          enableLunch={enableLunch}
          enableDinner={enableDinner}
          onMealsOutChange={() => {}}
        />
      </main>

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onUpdateServings={updateRecipeServings}
        />
      )}
    </div>
  );
}
