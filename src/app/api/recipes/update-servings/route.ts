import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { RecipeOverrides } from '@/types/recipe';

// PATCH update recipe servings
export async function PATCH(request: NextRequest) {
  try {
    const { id, servings } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID ricetta richiesto' },
        { status: 400 }
      );
    }

    // Get current overrides
    const recipe = db.prepare('SELECT userOverrides FROM recipes WHERE id = ?').get(id) as any;
    const currentOverrides: RecipeOverrides = recipe?.userOverrides ? JSON.parse(recipe.userOverrides) : {};
    
    // Update servings in overrides
    const newOverrides: RecipeOverrides = {
      ...currentOverrides,
      servings: servings || undefined,
    };

    db.prepare('UPDATE recipes SET userOverrides = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(newOverrides), id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating recipe servings:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento delle porzioni' },
      { status: 500 }
    );
  }
}
