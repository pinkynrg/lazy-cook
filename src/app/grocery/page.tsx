'use client';

import { useState, useEffect } from 'react';
import GroceryList from '@/components/GroceryList';
import type { GroceryItem } from '@/types/recipe';

export default function GroceryPage() {
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [isNormalized, setIsNormalized] = useState(false);

  useEffect(() => {
    loadGroceryListFromDb();
  }, []);

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

  const normalizeIngredients = async () => {
    try {
      const response = await fetch('/api/normalize-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: groceryList }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroceryList(data.normalizedItems);
        setIsNormalized(true);

        await fetch('/api/grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: data.normalizedItems, isNormalized: true }),
        });
      }
    } catch (error) {
      console.error('Error normalizing ingredients:', error);
    }
  };

  const toggleGroceryItemChecked = async (index: number) => {
    const updatedList = [...groceryList];
    updatedList[index].checked = !updatedList[index].checked;
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
          hasRecipes={groceryList.length > 0}
          groceryList={groceryList}
          onNormalize={normalizeIngredients}
          onToggleChecked={toggleGroceryItemChecked}
          onClearList={clearGroceryList}
        />
      </div>
    </div>
  );
}
