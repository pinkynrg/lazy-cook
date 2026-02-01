import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Recipe, JsonLdRecipe, RecipeOverrides } from '@/types/recipe';
import { jsonldToRecipe } from '@/lib/recipeParser';

// GET all recipes
export async function GET() {
  try {
    const recipes = db.prepare(`
      SELECT * FROM recipes ORDER BY dateAdded DESC
    `).all() as any[];

    // Parse JSON-LD and apply overrides
    const recipesWithData = recipes.map(row => {
      const jsonld: JsonLdRecipe = JSON.parse(row.jsonldSource);
      const overrides: RecipeOverrides | undefined = row.userOverrides ? JSON.parse(row.userOverrides) : undefined;

      console.log('🔍 API - Raw jsonld for', jsonld.name, ':', { image: jsonld.image });

      const assignments = db.prepare(`
        SELECT id, recipeId, dayOfWeek, mealType, plannedServings, createdAt
        FROM recipe_day_assignments
        WHERE recipeId = ?
        ORDER BY dayOfWeek, mealType
      `).all(row.id);

      const recipe = jsonldToRecipe(row.id, jsonld, overrides, row.dateAdded);
      console.log('✅ API - Parsed recipe', recipe.name, ':', { image: recipe.image });
      recipe.assignments = assignments as any;

      return recipe;
    });

    console.log('📤 API - Returning', recipesWithData.length, 'recipes');

    return NextResponse.json({ recipes: recipesWithData });
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
    const recipe: Recipe = await request.json();

    // Insert recipe with JSON-LD source
    const insertRecipe = db.prepare(`
      INSERT INTO recipes (jsonldSource, userOverrides, dateAdded)
      VALUES (?, ?, ?)
    `);

    const result = insertRecipe.run(
      JSON.stringify(recipe.jsonldSource),
      recipe.userOverrides ? JSON.stringify(recipe.userOverrides) : null,
      recipe.dateAdded
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
    const { id } = await request.json();

    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { error: 'Errore nella rimozione della ricetta' },
      { status: 500 }
    );
  }
}
