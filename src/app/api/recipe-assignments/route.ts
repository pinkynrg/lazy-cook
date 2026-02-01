import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET all recipe day assignments
export async function GET() {
  try {
    const assignments = db.prepare('SELECT * FROM recipe_day_assignments').all();
    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle assegnazioni' },
      { status: 500 }
    );
  }
}

// POST add a recipe to a day (allows duplicates)
export async function POST(request: NextRequest) {
  try {
    const { recipeId, dayOfWeek, mealType, plannedServings } = await request.json();

    if (!recipeId || dayOfWeek === undefined || dayOfWeek === null || !mealType) {
      return NextResponse.json(
        { error: 'recipeId, dayOfWeek e mealType sono richiesti' },
        { status: 400 }
      );
    }

    if (!['lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json(
        { error: 'mealType deve essere "lunch" o "dinner"' },
        { status: 400 }
      );
    }

    const servings = plannedServings || 2; // Default to 2 if not provided

    const result = db.prepare(
      'INSERT INTO recipe_day_assignments (recipeId, dayOfWeek, mealType, plannedServings) VALUES (?, ?, ?, ?)'
    ).run(recipeId, dayOfWeek, mealType, servings);

    return NextResponse.json({ success: true, assignmentId: result.lastInsertRowid });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione dell\'assegnazione' },
      { status: 500 }
    );
  }
}

// DELETE remove a specific assignment
export async function DELETE(request: NextRequest) {
  try {
    const { assignmentId } = await request.json();

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId è richiesto' },
        { status: 400 }
      );
    }

    db.prepare('DELETE FROM recipe_day_assignments WHERE id = ?').run(assignmentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Errore nella rimozione dell\'assegnazione' },
      { status: 500 }
    );
  }
}
