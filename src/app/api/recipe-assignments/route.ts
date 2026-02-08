import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET all recipe day assignments
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const assignments = db.prepare('SELECT * FROM recipe_day_assignments WHERE householdId = ?').all(session.householdId);
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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { recipeId, dayOfWeek, mealType, plannedServings } = await request.json();

    if (!recipeId || dayOfWeek === undefined || dayOfWeek === null || !mealType) {
      return NextResponse.json(
        { error: 'recipeId, dayOfWeek e mealType sono richiesti' },
        { status: 400 }
      );
    }

    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json(
        { error: 'mealType deve essere "breakfast", "lunch" o "dinner"' },
        { status: 400 }
      );
    }

    const parsedServings = plannedServings === undefined || plannedServings === null
      ? null
      : (typeof plannedServings === 'string' ? Number(plannedServings.replace(',', '.')) : plannedServings);

    const servings = parsedServings === null
      ? 2
      : (typeof parsedServings === 'number' && Number.isFinite(parsedServings) && parsedServings >= 1 ? parsedServings : null);

    if (servings === null) {
      return NextResponse.json(
        { error: 'plannedServings deve essere un numero >= 1' },
        { status: 400 }
      );
    }

    const result = db.prepare(
      'INSERT INTO recipe_day_assignments (recipeId, dayOfWeek, mealType, plannedServings, householdId) VALUES (?, ?, ?, ?, ?)'
    ).run(recipeId, dayOfWeek, mealType, servings, session.householdId);

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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assignmentId } = await request.json();

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId è richiesto' },
        { status: 400 }
      );
    }

    db.prepare('DELETE FROM recipe_day_assignments WHERE id = ? AND householdId = ?').run(assignmentId, session.householdId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Errore nella rimozione dell\'assegnazione' },
      { status: 500 }
    );
  }
}
