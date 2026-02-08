'use client';

import { useState, useEffect } from 'react';
import GroceryList from '@/components/GroceryList';
import type { GroceryItem, Recipe } from '@/types/recipe';

export default function GroceryPage() {
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [isNormalized, setIsNormalized] = useState(false);
  const [hasAssignments, setHasAssignments] = useState(false);

  useEffect(() => {
    loadGroceryListFromDb();
    checkForAssignments();
  }, []);

  const scaleIngredientQuantity = (quantity: string, ratio: number): string => {
    if (ratio === 1) return quantity;
    
    const match = quantity.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'));
      const unit = match[2];
      const scaled = (num * ratio).toFixed(1).replace(/\.0$/, '');
      return `${scaled} ${unit}`.trim();
    }
    
    return quantity;
  };

  const loadGroceryListFromDb = async () => {
    try {
      const response = await fetch('/api/grocery');
      if (response.ok) {
        const data = await response.json();
        setGroceryList(Array.isArray(data.items) ? data.items : []);
        setIsNormalized(data.isNormalized || false);
      }
    } catch (error) {
      console.error('Error loading grocery list:', error);
      setGroceryList([]);
      setIsNormalized(false);
    }
  };
  const checkForAssignments = async () => {
    try {
      const response = await fetch('/api/recipe-assignments');
      if (response.ok) {
        const data = await response.json();
        setHasAssignments(data.assignments && data.assignments.length > 0);
      }
    } catch (error) {
      console.error('Error checking assignments:', error);
      setHasAssignments(false);
    }
  };

  const buildGroceryListFromRecipes = async (): Promise<GroceryItem[]> => {
    try {
      // Fetch all recipes with their assignments
      const recipesResponse = await fetch('/api/recipes');
      if (!recipesResponse.ok) {
        throw new Error('Failed to fetch recipes');
      }
      const recipes = await recipesResponse.json(); // Array directly, not wrapped

      // Fetch assignments
      const assignmentsResponse = await fetch('/api/recipe-assignments');
      if (!assignmentsResponse.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const { assignments, mealsOut } = await assignmentsResponse.json();

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const ingredientMap = new Map<string, GroceryItem>();
      const mealsOutSet = new Set(mealsOut || []);

      // Group assignments by recipe
      const recipeMap = new Map<number, Recipe>();
      recipes.forEach((recipe: Recipe) => {
        recipeMap.set(recipe.id, recipe);
      });

      // Process each assignment
      assignments.forEach((assignment: any) => {
        const recipe = recipeMap.get(assignment.recipeId);
        if (!recipe || !recipe.ingredients) return;

        // Skip if this meal is marked as eating out
        const mealKey = `${assignment.dayOfWeek}-${assignment.mealType}`;
        if (mealsOutSet.has(mealKey)) {
          return;
        }

        // Get base servings from recipe
        const baseServings = recipe.servings ? parseFloat(recipe.servings) : null;
        const plannedServings = assignment.plannedServings || baseServings || 1;

        // Calculate scaling ratio
        const ratio = baseServings && baseServings > 0 
          ? plannedServings / baseServings 
          : 1;

        // Scale each ingredient for this assignment
        recipe.ingredients.forEach(ing => {
          const scaledQuantity = scaleIngredientQuantity(ing.quantity, ratio);
          const key = (ing.normalized || ing.name).toLowerCase();
          
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.quantities.push(scaledQuantity);
            existing.original.push(ing.original);
          } else {
            ingredientMap.set(key, {
              name: ing.normalized || ing.name,
              quantities: [scaledQuantity],
              original: [ing.original],
              normalized: false,
              checked: false,
            });
          }
        });
      });

      return Array.from(ingredientMap.values());
    } catch (error) {
      console.error('Error building grocery list:', error);
      return [];
    }
  };
  
  const normalizeIngredients = async () => {
    try {
      // Step 1: Build grocery list from weekly assignments
      const consolidatedList = await buildGroceryListFromRecipes();
      
      if (consolidatedList.length === 0) {
        alert('Nessuna ricetta assegnata alla settimana!');
        return;
      }

      // Step 2: Convert to flat ingredient strings for AI
      const allIngredients = consolidatedList.flatMap(item => 
        item.quantities.map(qty => `${item.name} ${qty}`.trim())
      );

      // Step 3: Normalize with AI
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

      // Step 4: Build final grocery list from AI results
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

      // Step 5: Save to database
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groceryList: normalizedList }),
      });

      // Reload to get IDs
      setTimeout(async () => {
        const reloadResponse = await fetch('/api/grocery');
        if (reloadResponse.ok) {
          const { groceryList: dbList } = await reloadResponse.json();
          setGroceryList(dbList);
        }
      }, 100);
    } catch (error: any) {
      console.error('Error normalizing ingredients:', error);
      alert('Errore: ' + error.message);
    }
  };

  const toggleGroceryItemChecked = async (itemId: number | undefined, checked: boolean) => {
    if (!itemId) return;
    
    const updatedList = groceryList.map(item => 
      item.id === itemId ? { ...item, checked } : item
    );
    setGroceryList(updatedList);

    try {
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedList, isNormalized }),
      });
    } catch (error) {
      console.error('Error updating grocery item:', error);
    }
  };

  const clearGroceryList = async () => {
    if (!confirm('Vuoi davvero svuotare la lista della spesa?')) return;

    setGroceryList([]);
    setIsNormalized(false);

    try {
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [], isNormalized: false }),
      });
    } catch (error) {
      console.error('Error clearing grocery list:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🛒 Lista della Spesa</h1>
        <p>Ingredienti necessari per il tuo piano settimanale</p>
      </div>

      <div className="page-content">
        <GroceryList
          isNormalized={isNormalized}
          hasRecipes={hasAssignments}
          groceryList={groceryList}
          onNormalize={normalizeIngredients}
          onToggleChecked={toggleGroceryItemChecked}
          onClearList={clearGroceryList}
        />
      </div>
    </div>
  );
}
