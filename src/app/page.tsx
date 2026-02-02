'use client';

import { useState, useEffect } from 'react';
import RecipeForm from '@/components/RecipeForm';
import RecipeCard from '@/components/RecipeCard';
import GroceryList from '@/components/GroceryList';
import RecipeModal from '@/components/RecipeModal';
import WeeklyPlanner from '@/components/WeeklyPlanner';
import SavedPlans from '@/components/SavedPlans';
import type { Recipe, GroceryItem, Settings } from '@/types/recipe';
import { jsonldToRecipe } from '@/lib/recipeParser';

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isNormalized, setIsNormalized] = useState(false);
  const [familySize, setFamilySize] = useState(2);
  const [enableBreakfast, setEnableBreakfast] = useState(false);
  const [enableLunch, setEnableLunch] = useState(true);
  const [enableDinner, setEnableDinner] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState('Piano Settimanale');
  const [libraryExpanded, setLibraryExpanded] = useState(false);

  // Load recipes from database
  useEffect(() => {
    loadRecipesFromDb();
    loadGroceryListFromDb();
    loadSettings();
  }, []);

  // Update grocery list when recipes change (only if not normalized)
  useEffect(() => {
    if (!isNormalized && recipes.length > 0) {
      buildGroceryListFromRecipes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, isNormalized]);

  // Helper function to parse and scale ingredient quantities
  const scaleIngredientQuantity = (quantityStr: string, ratio: number): string => {
    if (!quantityStr || ratio === 1) return quantityStr;

    // Try to extract number from the beginning of the string
    const match = quantityStr.match(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(.*)$/);
    
    if (match) {
      let num = match[1];
      const unit = match[2];

      // Handle fractions like "1/2"
      if (num.includes('/')) {
        const [numerator, denominator] = num.split('/').map(Number);
        num = String(numerator / denominator);
      }

      // Handle comma as decimal separator (Italian format)
      num = num.replace(',', '.');
      
      const value = parseFloat(num);
      if (!isNaN(value)) {
        const scaled = value * ratio;
        // Round to 2 decimal places and remove trailing zeros
        const formatted = Math.round(scaled * 100) / 100;
        return `${formatted}${unit ? ' ' + unit : ''}`;
      }
    }

    // If we can't parse it, return as is with a note
    return quantityStr;
  };

  const loadRecipesFromDb = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const { recipes: dbRecipes } = await response.json();
        console.log('📥 Page - Received recipes:', dbRecipes.map((r: any) => ({ name: r.name, image: r.image })));
        setRecipes(dbRecipes);
      } else {
        // Fallback to localStorage if DB fails
        const stored = localStorage.getItem('weekly-recipes');
        if (stored) {
          setRecipes(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('weekly-recipes');
      if (stored) {
        setRecipes(JSON.parse(stored));
      }
    }
  };

  const loadGroceryListFromDb = async () => {
    try {
      const response = await fetch('/api/grocery');
      if (response.ok) {
        const { groceryList: dbGroceryList } = await response.json();
        if (dbGroceryList && dbGroceryList.length > 0) {
          setGroceryList(dbGroceryList);
          setIsNormalized(true);
        }
      }
    } catch (error) {
      console.error('Error loading grocery list:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const { familySize: size, enableBreakfast, enableLunch, enableDinner } = await response.json();
        setFamilySize(size);
        setEnableBreakfast(enableBreakfast);
        setEnableLunch(enableLunch);
        setEnableDinner(enableDinner);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        if (updates.familySize !== undefined) setFamilySize(updates.familySize);
        if (updates.enableBreakfast !== undefined) setEnableBreakfast(updates.enableBreakfast);
        if (updates.enableLunch !== undefined) setEnableLunch(updates.enableLunch);
        if (updates.enableDinner !== undefined) setEnableDinner(updates.enableDinner);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Build grocery list from recipes (no API calls, just local state)
  const buildGroceryListFromRecipes = () => {
    if (recipes.length === 0) {
      setGroceryList([]);
      return;
    }

    const ingredientMap = new Map<string, GroceryItem>();

    // Only process recipes that have assignments (are scheduled in the week)
    recipes.forEach(recipe => {
      const assignments = recipe.assignments || [];
      
      // If recipe has no assignments, skip it
      if (assignments.length === 0) return;

      // Get base servings from recipe
      const baseServings = recipe.servings ? parseFloat(recipe.servings) : null;

      // Process each assignment separately (same recipe can appear multiple times)
      assignments.forEach(assignment => {
        const plannedServings = assignment.plannedServings;
        
        // Calculate scaling ratio
        const ratio = baseServings && baseServings > 0 
          ? plannedServings / baseServings 
          : 1;

        // Scale each ingredient for this assignment
        recipe.ingredients?.forEach(ing => {
          const scaledQuantity = scaleIngredientQuantity(ing.quantity, ratio);
          const key = (ing.normalized || ing.name).toLowerCase();
          
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.quantities.push(scaledQuantity);
            existing.original.push(ing.original);
            if ((ing as any).totalQuantity && !existing.totalQuantity) {
              existing.totalQuantity = (ing as any).totalQuantity;
            }
          } else {
            ingredientMap.set(key, {
              name: ing.normalized || ing.name,
              quantities: [scaledQuantity],
              original: [ing.original],
              normalized: !!ing.normalized,
              totalQuantity: (ing as any).totalQuantity,
              checked: false,
            });
          }
        });
      });
    });

    setGroceryList(Array.from(ingredientMap.values()));
  };

  const addRecipe = async (recipe: Recipe) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });

      if (response.ok) {
        const { recipeId } = await response.json();
        
        // Parse the recipe to populate computed properties
        const parsedRecipe = jsonldToRecipe(
          recipeId,
          recipe.jsonldSource,
          recipe.userOverrides,
          recipe.dateAdded
        );
        
        setRecipes([...recipes, parsedRecipe]);
        setIsNormalized(false); // Reset normalization when adding recipe
        // Also save to localStorage as backup
        localStorage.setItem('weekly-recipes', JSON.stringify([...recipes, parsedRecipe]));
      } else {
        throw new Error('Failed to save recipe');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      // Fallback to localStorage only - parse recipe here too
      const parsedRecipe = jsonldToRecipe(
        recipe.id,
        recipe.jsonldSource,
        recipe.userOverrides,
        recipe.dateAdded
      );
      setRecipes([...recipes, parsedRecipe]);
      localStorage.setItem('weekly-recipes', JSON.stringify([...recipes, parsedRecipe]));
    }
  };

  const removeRecipe = async (id: number) => {
    if (!confirm('Sei sicuro di voler rimuovere questa ricetta?')) return;

    try {
      const response = await fetch('/api/recipes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        const updatedRecipes = recipes.filter(r => r.id !== id);
        setIsNormalized(false); // Reset normalization when removing recipe
        setRecipes(updatedRecipes);
        localStorage.setItem('weekly-recipes', JSON.stringify(updatedRecipes));
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      // Fallback to local delete
      const updatedRecipes = recipes.filter(r => r.id !== id);
      setRecipes(updatedRecipes);
      localStorage.setItem('weekly-recipes', JSON.stringify(updatedRecipes));
    }
  };

  const normalizeIngredients = async () => {
    if (groceryList.length === 0) {
      alert('La lista della spesa è vuota! Aggiungi ricette alla settimana.');
      return;
    }

    try {
      // Send each ingredient with its scaled quantity so AI can normalize similar ones
      const allIngredients = groceryList.flatMap(item => 
        item.quantities.map(qty => `${item.name} ${qty}`.trim())
      );

      const response = await fetch('/api/normalize-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: allIngredients }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella normalizzazione');
      }

      const { normalized } = await response.json();

      // Build the final grocery list from AI-normalized results
      const normalizedList: GroceryItem[] = normalized.map((item: any) => ({
        name: item.normalizedName,
        quantities: [item.totalQuantity],
        original: [], 
        normalized: true,
        totalQuantity: item.totalQuantity,
        checked: false,
      }));

      setGroceryList(normalizedList);
      setIsNormalized(true);

      // Save grocery list to database
      setTimeout(async () => {
        try {
          // Save the normalized list
          await fetch('/api/grocery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groceryList: normalizedList }),
          });

          // Reload to get IDs
          const reloadResponse = await fetch('/api/grocery');
          if (reloadResponse.ok) {
            const { groceryList: dbList } = await reloadResponse.json();
            setGroceryList(dbList);
          }
        } catch (error) {
          console.error('Error saving grocery list to DB:', error);
        }
      }, 100);
    } catch (error: any) {
      alert('Errore nella normalizzazione: ' + error.message);
    }
  };

  const updateRecipeDay = async (recipeId: number, dayOfWeek: number | null) => {
    try {
      const response = await fetch('/api/recipes/update-day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipeId, dayOfWeek }),
      });

      if (response.ok) {
        const updatedRecipes = recipes.map(r =>
          r.id === recipeId ? { ...r, dayOfWeek } : r
        );
        setRecipes(updatedRecipes);
        localStorage.setItem('weekly-recipes', JSON.stringify(updatedRecipes));
      }
    } catch (error) {
      console.error('Error updating recipe day:', error);
    }
  };

  const toggleGroceryItemChecked = async (itemId: number | undefined, checked: boolean) => {
    if (!itemId) {
      console.warn('Cannot toggle item without ID');
      return;
    }

    // Optimistically update UI
    setGroceryList(prev =>
      prev.map(item => (item.id === itemId ? { ...item, checked } : item))
    );

    try {
      await fetch('/api/grocery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, checked }),
      });
    } catch (error) {
      console.error('Error updating grocery item:', error);
      // Revert on error
      setGroceryList(prev =>
        prev.map(item => (item.id === itemId ? { ...item, checked: !checked } : item))
      );
    }
  };

  const clearGroceryList = async () => {
    if (!confirm('Sei sicuro di voler svuotare la lista della spesa?')) {
      return;
    }

    try {
      await fetch('/api/grocery', {
        method: 'DELETE',
      });

      setGroceryList([]);
      setIsNormalized(false);
    } catch (error) {
      console.error('Error clearing grocery list:', error);
      alert('Errore nello svuotare la lista');
    }
  };

  const updateRecipeServings = async (recipeId: number, servings: string) => {
    try {
      const response = await fetch('/api/recipes/update-servings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipeId, servings }),
      });

      if (response.ok) {
        // Update local state
        const updatedRecipes = recipes.map(r =>
          r.id === recipeId ? { ...r, servings } : r
        );
        setRecipes(updatedRecipes);
        
        // Update selected recipe if it's the one being edited
        if (selectedRecipe?.id === recipeId) {
          setSelectedRecipe({ ...selectedRecipe, servings });
        }
        
        localStorage.setItem('weekly-recipes', JSON.stringify(updatedRecipes));
      }
    } catch (error) {
      console.error('Error updating servings:', error);
      alert('Errore nell\'aggiornamento delle porzioni');
    }
  };

  const addRecipeAssignment = async (recipeId: number, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    try {
      const response = await fetch('/api/recipe-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, dayOfWeek, mealType, plannedServings: familySize }),
      });

      if (response.ok) {
        await loadRecipesFromDb(); // Reload to get updated assignments
      }
    } catch (error) {
      console.error('Error adding assignment:', error);
    }
  };

  const updateAssignmentServings = async (assignmentId: number, plannedServings: number) => {
    try {
      const response = await fetch('/api/recipe-assignments/update-servings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, plannedServings }),
      });

      if (response.ok) {
        await loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error updating assignment servings:', error);
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
        await loadRecipesFromDb(); // Reload to get updated assignments
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const moveAssignment = async (assignmentId: number, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    try {
      const response = await fetch('/api/recipe-assignments/update-day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, dayOfWeek, mealType }),
      });

      if (response.ok) {
        await loadRecipesFromDb();
      }
    } catch (error) {
      console.error('Error moving assignment:', error);
    }
  };

  return (
    <div className="container">
      <header>
        <div className="header-top">
          <button 
            className="btn btn-outline settings-menu-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Impostazioni"
          >
            <span className="hamburger-icon">☰</span>
            <span className="settings-text">Impostazioni</span>
          </button>
          <div className="header-content">
            <h1>🍳 Lazy Cook</h1>
            <p>Gestisci le tue ricette settimanali e la lista della spesa</p>
          </div>
        </div>
        
        {showSettings && (
          <>
            <div className="settings-overlay" onClick={() => setShowSettings(false)} />
            <div className="settings-panel">
              <div className="settings-header">
                <h3><i className="bi bi-gear-fill"></i> Impostazioni</h3>
                <button className="settings-close-btn" onClick={() => setShowSettings(false)} title="Chiudi">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              
              <div className="settings-content">
                <div className="setting-item">
                  <div className="setting-label">
                    <i className="bi bi-people-fill"></i>
                    <label htmlFor="familySize">Numero persone in famiglia</label>
                  </div>
                  <input
                    id="familySize"
                    type="number"
                    min="1"
                    max="20"
                    value={familySize}
                    onChange={(e) => updateSettings({ familySize: parseInt(e.target.value) || 1 })}
                    className="family-size-input"
                  />
                  <span className="setting-hint">Porzioni predefinite per i pasti</span>
                </div>

                <div className="setting-item">
                  <div className="setting-label">
                    <i className="bi bi-calendar-check-fill"></i>
                    <label>Pasti da pianificare</label>
                  </div>
                  <div className="meal-toggles">
                    <label className="meal-toggle-item">
                      <input
                        type="checkbox"
                        checked={enableBreakfast}
                        onChange={(e) => updateSettings({ enableBreakfast: e.target.checked })}
                      />
                      <span><i className="bi bi-sunrise-fill"></i> Colazione</span>
                    </label>
                    <label className="meal-toggle-item">
                      <input
                        type="checkbox"
                        checked={enableLunch}
                        onChange={(e) => updateSettings({ enableLunch: e.target.checked })}
                      />
                      <span><i className="bi bi-sun-fill"></i> Pranzo</span>
                    </label>
                    <label className="meal-toggle-item">
                      <input
                        type="checkbox"
                        checked={enableDinner}
                        onChange={(e) => updateSettings({ enableDinner: e.target.checked })}
                      />
                      <span><i className="bi bi-moon-fill"></i> Cena</span>
                    </label>
                  </div>
                  <span className="setting-hint">Scegli quali pasti mostrare nel piano settimanale</span>
                </div>

                <div className="setting-item">
                  <div className="setting-label">
                    <i className="bi bi-clock-history"></i>
                    <label>Piani salvati</label>
                  </div>
                  <SavedPlans 
                    onRestore={loadRecipesFromDb} 
                    currentPlanName={currentPlanName}
                    onPlanNameChange={setCurrentPlanName}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      <main>
        <section className="recipe-library-section">
          <div className="library-header">
            <h2>🍳 Le Mie Ricette ({recipes.length})</h2>
            <button 
              className="pool-toggle-btn" 
              type="button"
              onClick={() => setLibraryExpanded(!libraryExpanded)}
            >
              {libraryExpanded ? '▼' : '▶'}
            </button>
          </div>
          <RecipeForm onAddRecipe={addRecipe} />
          {libraryExpanded && (
            <>
              <p className="library-hint">🖱️ Trascina le ricette nei giorni o usa il pulsante + per aggiungerle</p>
              <div className="recipe-pool">
            {recipes.length === 0 ? (
              <p className="empty-pool">Nessuna ricetta disponibile</p>
            ) : (
              recipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onView={setSelectedRecipe}
                  onRemove={removeRecipe}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('recipeId', recipe.id.toString());
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                />
              ))
            )}
          </div>
            </>
          )}
        </section>

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
          enableBreakfast={enableBreakfast}
          enableLunch={enableLunch}
          enableDinner={enableDinner}
        />

        <div className="main-content">

          <GroceryList
            isNormalized={isNormalized}
            hasRecipes={recipes.length > 0}
            groceryList={groceryList}
            onNormalize={normalizeIngredients}
            onToggleChecked={toggleGroceryItemChecked}
            onClearList={clearGroceryList}
          />
        </div>
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
