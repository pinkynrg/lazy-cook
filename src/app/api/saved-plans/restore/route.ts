import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// POST restore a saved plan
export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'planId è richiesto' },
        { status: 400 }
      );
    }

    // Get saved plan recipes
    const savedRecipes = db.prepare(
      'SELECT * FROM saved_plan_recipes WHERE planId = ?'
    ).all(planId) as any[];

    // Get saved plan assignments
    const savedAssignments = db.prepare(
      'SELECT * FROM saved_plan_assignments WHERE planId = ?'
    ).all(planId) as any[];

    if (savedAssignments.length === 0) {
      return NextResponse.json(
        { error: 'Piano vuoto o non trovato' },
        { status: 404 }
      );
    }

    // Map old recipe IDs to new recipe IDs (in case we need to recreate recipes)
    const recipeIdMap = new Map<number, number>();
    let restoredRecipes = 0;

    // Restore recipes to library if they don't exist
    for (const savedRecipe of savedRecipes) {
      // First check if the recipe exists by its original ID
      let existingRecipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(savedRecipe.recipeId) as any;
      
      // If not found by ID, check if a recipe with the same name and URL exists (could be from another restored plan)
      if (!existingRecipe && savedRecipe.recipeUrl) {
        existingRecipe = db.prepare('SELECT id FROM recipes WHERE url = ? AND url IS NOT NULL').get(savedRecipe.recipeUrl) as any;
      }
      
      // If still not found, check by exact name match
      if (!existingRecipe) {
        existingRecipe = db.prepare('SELECT id FROM recipes WHERE name = ?').get(savedRecipe.recipeName) as any;
      }
      
      if (existingRecipe) {
        // Recipe already exists, use its ID
        recipeIdMap.set(savedRecipe.recipeId, existingRecipe.id);
      } else {
        // Recipe doesn't exist, recreate it
        const now = new Date().toISOString();
        const recipeResult = db.prepare(
          'INSERT INTO recipes (name, image, prepTime, servings, url, dateAdded) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          savedRecipe.recipeName,
          savedRecipe.recipeImage,
          savedRecipe.recipePrepTime,
          savedRecipe.recipeServings,
          savedRecipe.recipeUrl,
          now
        );

        const newRecipeId = recipeResult.lastInsertRowid as number;
        recipeIdMap.set(savedRecipe.recipeId, newRecipeId);

        // Restore ingredients
        const ingredients = JSON.parse(savedRecipe.recipeIngredients);
        const insertIngredient = db.prepare(
          'INSERT INTO ingredients (recipeId, original, quantity, name, normalized) VALUES (?, ?, ?, ?, ?)'
        );

        for (const ingredient of ingredients) {
          insertIngredient.run(
            newRecipeId,
            ingredient.original,
            ingredient.quantity,
            ingredient.name,
            ingredient.normalized
          );
        }

        restoredRecipes++;
      }
    }

    // Clear current assignments
    db.prepare('DELETE FROM recipe_day_assignments').run();

    // Restore assignments with mapped recipe IDs
    const insertAssignment = db.prepare(
      'INSERT INTO recipe_day_assignments (recipeId, dayOfWeek, mealType, plannedServings) VALUES (?, ?, ?, ?)'
    );

    let restoredAssignments = 0;
    for (const assignment of savedAssignments) {
      const newRecipeId = recipeIdMap.get(assignment.recipeId);
      if (newRecipeId) {
        insertAssignment.run(
          newRecipeId,
          assignment.dayOfWeek,
          assignment.mealType,
          assignment.plannedServings
        );
        restoredAssignments++;
      }
    }

    let message = 'Piano ripristinato con successo!';
    if (restoredRecipes > 0) {
      message = `Piano ripristinato: ${restoredRecipes} ricetta/e aggiunte alla libreria.`;
    }

    return NextResponse.json({ 
      success: true, 
      restoredRecipes,
      message
    });
  } catch (error: any) {
    console.error('Error restoring plan:', error);
    return NextResponse.json(
      { error: 'Errore nel ripristino del piano' },
      { status: 500 }
    );
  }
}
