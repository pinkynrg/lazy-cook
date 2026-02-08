import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// POST restore a saved plan
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      'SELECT spr.* FROM saved_plan_recipes spr JOIN saved_plans sp ON spr.planId = sp.id WHERE spr.planId = ? AND sp.householdId = ? ORDER BY spr.id'
    ).all(planId, session.householdId) as any[];

    // Get saved plan assignments  
    const savedAssignments = db.prepare(
      'SELECT spa.* FROM saved_plan_assignments spa JOIN saved_plans sp ON spa.planId = sp.id WHERE spa.planId = ? AND sp.householdId = ? ORDER BY spa.id'
    ).all(planId, session.householdId) as any[];

    // Get saved eating out meals
    const savedEatingOut = db.prepare(
      'SELECT speo.* FROM saved_plan_eating_out speo JOIN saved_plans sp ON speo.planId = sp.id WHERE speo.planId = ? AND sp.householdId = ? ORDER BY speo.id'
    ).all(planId, session.householdId) as any[];

    if (savedAssignments.length === 0) {
      return NextResponse.json(
        { error: 'Piano vuoto o non trovato' },
        { status: 404 }
      );
    }

    // Build map: original recipeId -> new recipeId
    const recipeIdMap = new Map<number, number>();
    const processedUrls = new Map<string, number>(); // Track URLs we've already processed in this restore
    let restoredRecipes = 0;

    console.log(`[RESTORE] Starting restore for plan ${planId}`);
    console.log(`[RESTORE] Found ${savedRecipes.length} saved recipes to process`);

    // Get all existing recipes once
    const allExistingRecipes = db.prepare('SELECT id, jsonldSource FROM recipes WHERE householdId = ?').all(session.householdId) as any[];
    console.log(`[RESTORE] Found ${allExistingRecipes.length} existing recipes in database`);

    // Restore recipes and build mapping
    for (let i = 0; i < savedRecipes.length; i++) {
      const savedRecipe = savedRecipes[i];
      // For old plans, originalRecipeId might be null, so use index-based mapping
      const oldRecipeId = savedRecipe.originalRecipeId || (i + 1);
      
      console.log(`\n[RESTORE] Processing recipe ${i + 1}/${savedRecipes.length}`);
      console.log(`[RESTORE]   Old recipe ID: ${oldRecipeId}`);
      console.log(`[RESTORE]   Saved recipe originalRecipeId: ${savedRecipe.originalRecipeId}`);
      
      // Parse JSON-LD to get URL for duplicate checking
      const jsonldData = JSON.parse(savedRecipe.recipeJsonld);
      const recipeUrl = jsonldData.url || jsonldData['@id'];
      const recipeName = jsonldData.name || 'Unknown';
      
      console.log(`[RESTORE]   Recipe name: ${recipeName}`);
      console.log(`[RESTORE]   Recipe URL: ${recipeUrl || 'NO URL'}`);
      
      // Check if we've already processed this URL in this restore operation
      if (recipeUrl && processedUrls.has(recipeUrl)) {
        const existingId = processedUrls.get(recipeUrl)!;
        console.log(`[RESTORE]   ✓ Already processed this URL in this restore (mapped to ID ${existingId})`);
        recipeIdMap.set(oldRecipeId, existingId);
        continue;
      }
      
      // Check if recipe already exists in database by URL
      let existingRecipe = null;
      if (recipeUrl) {
        existingRecipe = allExistingRecipes.find(r => {
          try {
            const rData = JSON.parse(r.jsonldSource);
            const rUrl = rData.url || rData['@id'];
            return rUrl === recipeUrl;
          } catch {
            return false;
          }
        });
      }
      
      if (existingRecipe) {
        // Recipe exists, map old ID to existing ID
        console.log(`[RESTORE]   ✓ Found existing recipe in DB with ID ${existingRecipe.id}`);
        recipeIdMap.set(oldRecipeId, existingRecipe.id);
        if (recipeUrl) {
          processedUrls.set(recipeUrl, existingRecipe.id);
        }
      } else {
        // Create new recipe
        console.log(`[RESTORE]   → Creating NEW recipe in database`);
        const now = new Date().toISOString();
        const result = db.prepare(
          'INSERT INTO recipes (jsonldSource, userOverrides, dateAdded, householdId) VALUES (?, ?, ?, ?)'
        ).run(savedRecipe.recipeJsonld, savedRecipe.recipeOverrides || null, now, session.householdId);
        
        const newRecipeId = result.lastInsertRowid as number;
        console.log(`[RESTORE]   ✓ Created new recipe with ID ${newRecipeId}`);
        recipeIdMap.set(oldRecipeId, newRecipeId);
        if (recipeUrl) {
          processedUrls.set(recipeUrl, newRecipeId);
        }
        restoredRecipes++;
      }
    }

    console.log(`\n[RESTORE] Recipe ID mapping:`, Object.fromEntries(recipeIdMap));
    console.log(`[RESTORE] Processed URLs:`, Object.fromEntries(processedUrls));
    console.log(`[RESTORE] Total new recipes created: ${restoredRecipes}`);

    // Clear current assignments
    db.prepare('DELETE FROM recipe_day_assignments WHERE householdId = ?').run(session.householdId);

    // Clear eating out meals
    db.prepare('DELETE FROM eating_out_meals WHERE householdId = ?').run(session.householdId);

    // Restore assignments with mapped recipe IDs
    const insertAssignment = db.prepare(
      'INSERT INTO recipe_day_assignments (recipeId, dayOfWeek, mealType, plannedServings, householdId) VALUES (?, ?, ?, ?, ?)'
    );

    let restoredAssignments = 0;
    for (const assignment of savedAssignments) {
      const newRecipeId = recipeIdMap.get(assignment.recipeId);
      if (newRecipeId) {
        insertAssignment.run(
          newRecipeId,
          assignment.dayOfWeek,
          assignment.mealType,
          assignment.plannedServings,
          session.householdId
        );
        restoredAssignments++;
      }
    }

    // Restore eating out meals
    const insertEatingOut = db.prepare(
      'INSERT INTO eating_out_meals (dayOfWeek, mealType, userId, householdId) VALUES (?, ?, ?, ?)'
    );

    for (const meal of savedEatingOut) {
      insertEatingOut.run(
        meal.dayOfWeek,
        meal.mealType,
        session.userId,
        session.householdId
      );
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
