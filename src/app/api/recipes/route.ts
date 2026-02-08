import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Recipe, JsonLdRecipe, RecipeOverrides } from '@/types/recipe';
import { jsonldToRecipe } from '@/lib/recipeParser';
import { getSession } from '@/lib/auth';

// GET all recipes
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipes = db.prepare(`
      SELECT * FROM recipes WHERE householdId = ? ORDER BY dateAdded DESC
    `).all(session.householdId) as any[];

    // Parse JSON-LD and apply overrides
    const recipesWithData = recipes.map(row => {
      const jsonld: JsonLdRecipe = JSON.parse(row.jsonldSource);
      const overrides: RecipeOverrides | undefined = row.userOverrides ? JSON.parse(row.userOverrides) : undefined;

      console.log('🔍 API - Raw jsonld for', jsonld.name, ':', { image: jsonld.image });

      const assignments = db.prepare(`
        SELECT id, recipeId, dayOfWeek, mealType, plannedServings, createdAt
        FROM recipe_day_assignments
        WHERE recipeId = ? AND householdId = ?
        ORDER BY dayOfWeek, mealType
      `).all(row.id, session.householdId);

      const recipe = jsonldToRecipe(row.id, jsonld, overrides, row.dateAdded);
      console.log('✅ API - Parsed recipe', recipe.name, ':', { image: recipe.image });
      recipe.assignments = assignments as any;

      return recipe;
    });

    console.log('📤 API - Returning', recipesWithData.length, 'recipes');

    return NextResponse.json(recipesWithData);
  } catch (error: any) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle ricette' },
      { status: 500 }
    );
  }
}

// POST create new recipe
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipe: Recipe = await request.json();

    // Insert recipe with JSON-LD source
    const insertRecipe = db.prepare(`
      INSERT INTO recipes (jsonldSource, userOverrides, dateAdded, householdId)
      VALUES (?, ?, ?, ?)
    `);

    const result = insertRecipe.run(
      JSON.stringify(recipe.jsonldSource),
      recipe.userOverrides ? JSON.stringify(recipe.userOverrides) : null,
      recipe.dateAdded,
      session.householdId
    );

    const recipeId = result.lastInsertRowid;

    return NextResponse.json({ 
      success: true, 
      recipeId: Number(recipeId) 
    });
  } catch (error: any) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione della ricetta' },
      { status: 500 }
    );
  }
}

// DELETE recipe
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();

    db.prepare('DELETE FROM recipes WHERE id = ? AND householdId = ?').run(id, session.householdId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Errore nella rimozione della ricetta' },
      { status: 500 }
    );
  }
}

// PUT update recipe
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, servings, prepTime, totalTime, instructions, image, ingredients } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID ricetta richiesto' },
        { status: 400 }
      );
    }

    // Get current recipe
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ? AND householdId = ?')
      .get(id, session.householdId) as any;

    if (!recipe) {
      return NextResponse.json(
        { error: 'Ricetta non trovata' },
        { status: 404 }
      );
    }

    const jsonld: JsonLdRecipe = JSON.parse(recipe.jsonldSource);
    const currentOverrides: RecipeOverrides = recipe.userOverrides ? JSON.parse(recipe.userOverrides) : {};

    // Update overrides with new values
    const updatedOverrides: RecipeOverrides = {
      ...currentOverrides,
      ...(servings !== undefined && { servings }),
      ...(instructions !== undefined && { instructions })
    };

    // Update JSON-LD with new values if provided
    if (name !== undefined && name !== jsonld.name) {
      jsonld.name = name;
    }
    if (prepTime !== undefined) {
      jsonld.prepTime = prepTime || null;
    }
    if (totalTime !== undefined) {
      jsonld.totalTime = totalTime || null;
    }
    if (image !== undefined) {
      jsonld.image = image || null;
    }
    if (ingredients !== undefined) {
      // Convert ingredients string (one per line) to recipeIngredient array
      const ingredientLines = ingredients.split('\n').filter((line: string) => line.trim());
      jsonld.recipeIngredient = ingredientLines;
    }

    // Update database
    db.prepare(`
      UPDATE recipes 
      SET jsonldSource = ?, userOverrides = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND householdId = ?
    `).run(
      JSON.stringify(jsonld),
      JSON.stringify(updatedOverrides),
      id,
      session.householdId
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della ricetta' },
      { status: 500 }
    );
  }
}
