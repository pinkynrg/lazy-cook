import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET all saved plans
export async function GET() {
  try {
    const plans = db.prepare('SELECT * FROM saved_plans ORDER BY createdAt DESC').all();
    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('Error fetching saved plans:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei piani salvati' },
      { status: 500 }
    );
  }
}

// POST save current plan
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Il nome del piano è richiesto' },
        { status: 400 }
      );
    }

    // Get current assignments
    const currentAssignments = db.prepare('SELECT * FROM recipe_day_assignments').all() as any[];

    if (currentAssignments.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna ricetta pianificata da salvare' },
        { status: 400 }
      );
    }

    // Get eating out meals
    const eatingOutMeals = db.prepare('SELECT * FROM eating_out_meals').all() as any[];

    // Get unique recipe IDs from assignments
    const recipeIds = [...new Set(currentAssignments.map(a => a.recipeId))];

    // Create saved plan
    const result = db.prepare(
      'INSERT INTO saved_plans (name, description) VALUES (?, ?)'
    ).run(name, null);

    const planId = result.lastInsertRowid;

    // Save complete recipe data (snapshot) - store jsonldSource and userOverrides
    const insertRecipe = db.prepare(
      'INSERT INTO saved_plan_recipes (planId, originalRecipeId, recipeJsonld, recipeOverrides) VALUES (?, ?, ?, ?)'
    );

    for (const recipeId of recipeIds) {
      const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId) as any;
      if (recipe) {
        insertRecipe.run(
          planId,
          recipeId,
          recipe.jsonldSource,
          recipe.userOverrides || null
        );
      }
    }

    // Copy assignments to saved plan
    const insertAssignment = db.prepare(
      'INSERT INTO saved_plan_assignments (planId, recipeId, dayOfWeek, mealType, plannedServings) VALUES (?, ?, ?, ?, ?)'
    );

    for (const assignment of currentAssignments) {
      insertAssignment.run(
        planId,
        assignment.recipeId,
        assignment.dayOfWeek,
        assignment.mealType,
        assignment.plannedServings
      );
    }

    // Save eating out meals
    const insertEatingOut = db.prepare(
      'INSERT INTO saved_plan_eating_out (planId, dayOfWeek, mealType) VALUES (?, ?, ?)'
    );

    for (const meal of eatingOutMeals) {
      insertEatingOut.run(
        planId,
        meal.dayOfWeek,
        meal.mealType
      );
    }

    return NextResponse.json({ success: true, planId });
  } catch (error: any) {
    console.error('Error saving plan:', error);
    return NextResponse.json(
      { error: 'Errore nel salvataggio del piano' },
      { status: 500 }
    );
  }
}

// DELETE a saved plan
export async function DELETE(request: NextRequest) {
  try {
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'planId è richiesto' },
        { status: 400 }
      );
    }

    db.prepare('DELETE FROM saved_plans WHERE id = ?').run(planId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting saved plan:', error);
    return NextResponse.json(
      { error: 'Errore nella rimozione del piano' },
      { status: 500 }
    );
  }
}
