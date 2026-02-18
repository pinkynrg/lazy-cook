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
  const [autoExpandCurrentDayMobile, setAutoExpandCurrentDayMobile] = useState(true);

  useEffect(() => {
    loadRecipesFromDb();
    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      loadSettings();
    };
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
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
        setAutoExpandCurrentDayMobile(data.autoExpandCurrentDayMobile !== undefined ? data.autoExpandCurrentDayMobile : true);
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, plannedServings: servings }),
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
    <div className="page-container">
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
        autoExpandCurrentDayMobile={autoExpandCurrentDayMobile}
        onMealsOutChange={() => {}}
      />

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onUpdateServings={updateRecipeServings}
          onUpdateRecipe={updateRecipe}
        />
      )}
    </div>
  );
}
