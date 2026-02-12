'use client';

import { useState, useEffect } from 'react';
import GroceryList from '@/components/GroceryList/GroceryList';
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

  const parseServings = (servingsStr: string | null | undefined): number | null => {
    if (!servingsStr) return null;
    
    // Remove common words
    const cleaned = servingsStr.toLowerCase()
      .replace(/porzioni|persone|people|servings?/gi, '')
      .trim();
    
    // Handle fractions like "2 / 4" or "2/4" - take the smaller number (min servings)
    const fractionMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
    if (fractionMatch) {
      const num1 = parseFloat(fractionMatch[1].replace(',', '.'));
      const num2 = parseFloat(fractionMatch[2].replace(',', '.'));
      return Math.min(num1, num2);
    }
    
    // Handle ranges like "2-4" or "2 - 4" - take the smaller number (min servings)
    const rangeMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);
    if (rangeMatch) {
      const num1 = parseFloat(rangeMatch[1].replace(',', '.'));
      const num2 = parseFloat(rangeMatch[2].replace(',', '.'));
      return Math.min(num1, num2);
    }
    
    // Simple number
    const simpleMatch = cleaned.match(/(\d+(?:[.,]\d+)?)/);
    if (simpleMatch) {
      return parseFloat(simpleMatch[1].replace(',', '.'));
    }
    
    return null;
  };

  const loadGroceryListFromDb = async () => {
    try {
      const response = await fetch('/api/grocery');
      if (response.ok) {
        const data = await response.json();
        setGroceryList(data.groceryList || []);
        // Check if any item is normalized to set the flag
        setIsNormalized(data.groceryList?.some((item: GroceryItem) => item.normalized) || false);
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
        const baseServings = parseServings(recipe.servings);
        const plannedServingsRaw = assignment.plannedServings;
        const plannedServingsParsed = typeof plannedServingsRaw === 'string'
          ? Number(plannedServingsRaw.replace(',', '.'))
          : plannedServingsRaw;
        const plannedServings = typeof plannedServingsParsed === 'number' && Number.isFinite(plannedServingsParsed) && plannedServingsParsed > 0
          ? plannedServingsParsed
          : (baseServings ?? 1);

        // Calculate scaling ratio
        const ratio = baseServings && baseServings > 0 
          ? plannedServings / baseServings 
          : 1;

        // Scale each ingredient for this assignment
        recipe.ingredients.forEach(ing => {
          // Some ingredients come in as "5 uova" with empty quantity; recover that.
          let ingredientName = ing.normalized || ing.name;
          let ingredientQuantity = ing.quantity || '';

          if (!ingredientQuantity || ingredientQuantity.trim() === '') {
            const candidate = `${ingredientName}`.trim().replace(/^[-–•]\s*/, '');
            const countMatch = candidate.match(/^(?:n\.?\s*)?([\d.,\/]+)\s+(.+)$/i);
            if (countMatch) {
              ingredientQuantity = countMatch[1].trim();
              // Only update the display/grouping name if we are not using a normalized name
              if (!ing.normalized) {
                ingredientName = countMatch[2].trim();
              }
            }
          }

          const scaledQuantity = scaleIngredientQuantity(ingredientQuantity, ratio);
          const key = (ingredientName || ing.name).toLowerCase();
          
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.quantities.push(scaledQuantity);
            existing.original.push(ing.original);
            existing.sources?.push({
              recipeName: recipe.name || 'Ricetta senza nome',
              recipeId: recipe.id,
              assignmentId: assignment.id,
              dayOfWeek: assignment.dayOfWeek,
              mealType: assignment.mealType,
              quantity: scaledQuantity,
              originalText: ing.original,
            });
          } else {
            ingredientMap.set(key, {
              name: ingredientName || ing.name,
              quantities: [scaledQuantity],
              original: [ing.original],
              normalized: false,
              checked: false,
              sources: [{
                recipeName: recipe.name || 'Ricetta senza nome',
                recipeId: recipe.id,
                assignmentId: assignment.id,
                dayOfWeek: assignment.dayOfWeek,
                mealType: assignment.mealType,
                quantity: scaledQuantity,
                originalText: ing.original,
              }],
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

      // Step 2: Convert to flat ingredient strings for AI, keeping track of sources
      const ingredientsList: Array<{ text: string; sources: any[] }> = [];
      consolidatedList.forEach(item => {
        item.quantities.forEach(qty => {
          const qtyText = (qty ?? '').toString().trim();
          const nameText = (item.name ?? '').toString().trim();
          // Help the LLM parse quantities: prefer "<qty> <name>" for numeric quantities (e.g. "5 uova")
          const looksNumericFirst = /^\d/.test(qtyText);
          const text = qtyText
            ? (looksNumericFirst ? `${qtyText} ${nameText}`.trim() : `${nameText} ${qtyText}`.trim())
            : nameText;

          ingredientsList.push({
            text,
            sources: item.sources || []
          });
        });
      });
      
      const allIngredients = ingredientsList.map(i => i.text);

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
      
      console.log('AI normalized items:', normalized);

      // Step 4: Build final grocery list from AI results
      // Keep track of all sources from the consolidated list
      const tokenizeForMatch = (text: string): string[] => {
        const cleaned = text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[’']/g, ' ')
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const stopwords = new Set(['di', 'd', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'alle', 'da', 'in', 'con', 'e']);
        return cleaned
          .split(' ')
          .filter(Boolean)
          .filter(t => !stopwords.has(t));
      };

      const isSubset = (needles: string[], haystack: string[]): boolean => {
        if (needles.length === 0) return false;
        const hay = new Set(haystack);
        return needles.every(t => hay.has(t));
      };

      const allSourcesByIngredient = new Map<string, any[]>();
      consolidatedList.forEach(item => {
        if (item.sources && item.sources.length > 0) {
          allSourcesByIngredient.set(item.name.toLowerCase(), item.sources);
        }
      });

      // Create a map to ensure unique items by name (in case AI returns duplicates)
      const normalizedMap = new Map<string, GroceryItem>();
      
      normalized.forEach((item: any) => {
        const nameLower = item.normalizedName.toLowerCase();
        
        // If we already have this item, skip it (take first occurrence)
        if (normalizedMap.has(nameLower)) {
          console.warn('Duplicate normalized item found:', item.normalizedName);
          return;
        }
        
        // Try to find sources by matching ingredient names
        const foundSources: any[] = [];
        const normalizedTokens = tokenizeForMatch(item.normalizedName);
        
        // Check all original items for matches
        for (const [originalName, sources] of allSourcesByIngredient.entries()) {
          // Match if either name contains the other (fast path)
          if (nameLower.includes(originalName) || originalName.includes(nameLower)) {
            foundSources.push(...sources);
            continue;
          }

          // Token-based match (handles inserted adjectives like "extravergine")
          const originalTokens = tokenizeForMatch(originalName);
          const tokenMatch =
            (normalizedTokens.length >= 2 && isSubset(normalizedTokens, originalTokens)) ||
            (originalTokens.length >= 2 && isSubset(originalTokens, normalizedTokens)) ||
            (normalizedTokens.length === 1 && originalTokens[0] === normalizedTokens[0]);

          if (tokenMatch) {
            foundSources.push(...sources);
          }
        }
        
        // Deduplicate conservatively: do NOT collapse multiple meals in the week.
        // Prefer assignmentId when present; fallback includes day/meal/originalText.
        const uniqueSources = Array.from(
          new Map(
            foundSources.map((s) => {
              const assignmentPart = s.assignmentId !== undefined && s.assignmentId !== null
                ? `a:${s.assignmentId}`
                : `d:${s.dayOfWeek ?? 'x'}-m:${s.mealType ?? 'x'}`;
              const key = `${assignmentPart}-r:${s.recipeId}-o:${s.originalText ?? ''}`;
              return [key, s] as const;
            })
          ).values()
        );

        normalizedMap.set(nameLower, {
          name: item.normalizedName,
          quantities: [item.totalQuantity],
          original: [],
          normalized: true,
          totalQuantity: item.totalQuantity,
          checked: false,
          sources: uniqueSources.length > 0 ? uniqueSources : undefined,
        });
      });

      const normalizedList = Array.from(normalizedMap.values());
      console.log('Final normalized list:', normalizedList);
      console.log('Sample item with sources:', normalizedList.find(i => i.sources && i.sources.length > 0));
      
      setGroceryList(normalizedList);
      setIsNormalized(true);

      // Step 5: Save to database
      console.log('Saving to database...');
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groceryList: normalizedList }),
      });

      // Reload to get IDs
      setTimeout(async () => {
        console.log('Reloading from database...');
        const reloadResponse = await fetch('/api/grocery');
        if (reloadResponse.ok) {
          const { groceryList: dbList } = await reloadResponse.json();
          console.log('Reloaded from DB:', dbList);
          console.log('Sample DB item with sources:', dbList.find((i: any) => i.sources && i.sources.length > 0));
          setGroceryList(Array.isArray(dbList) ? [...dbList] : []);
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
        body: JSON.stringify({ groceryList: updatedList }),
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
        body: JSON.stringify({ groceryList: [] }),
      });
    } catch (error) {
      console.error('Error clearing grocery list:', error);
    }
  };

  return (
    <div className="page-container">
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
