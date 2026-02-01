import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { GroceryItem } from '@/types/recipe';

// GET all grocery items
export async function GET() {
  try {
    const items = db.prepare('SELECT * FROM grocery_items ORDER BY sortOrder, id').all();
    
    const groceryList: GroceryItem[] = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantities: JSON.parse(item.quantities),
      original: JSON.parse(item.original),
      normalized: !!item.normalized,
      totalQuantity: item.totalQuantity,
      checked: !!item.checked,
    }));

    return NextResponse.json({ groceryList });
  } catch (error: any) {
    console.error('Error fetching grocery items:', error);
    return NextResponse.json(
      { error: 'Errore nel caricamento della lista' },
      { status: 500 }
    );
  }
}

// POST save entire grocery list (replaces existing)
export async function POST(request: NextRequest) {
  try {
    const { groceryList } = await request.json();

    // Start transaction
    const transaction = db.transaction(() => {
      // Clear existing items
      db.prepare('DELETE FROM grocery_items').run();

      // Insert new items with sortOrder
      const insert = db.prepare(`
        INSERT INTO grocery_items (name, quantities, original, normalized, totalQuantity, checked, sortOrder)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      groceryList.forEach((item: GroceryItem, index: number) => {
        insert.run(
          item.name,
          JSON.stringify(item.quantities),
          JSON.stringify(item.original),
          item.normalized ? 1 : 0,
          item.totalQuantity || null,
          item.checked ? 1 : 0,
          index // Preserve order
        );
      });
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving grocery list:', error);
    return NextResponse.json(
      { error: 'Errore nel salvataggio della lista' },
      { status: 500 }
    );
  }
}

// PATCH update single item (toggle checked)
export async function PATCH(request: NextRequest) {
  try {
    const { id, checked } = await request.json();

    db.prepare('UPDATE grocery_items SET checked = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
      .run(checked ? 1 : 0, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating grocery item:', error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento dell'item" },
      { status: 500 }
    );
  }
}

// DELETE clear all grocery items
export async function DELETE() {
  try {
    db.prepare('DELETE FROM grocery_items').run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing grocery list:', error);
    return NextResponse.json(
      { error: 'Errore nella cancellazione della lista' },
      { status: 500 }
    );
  }
}
