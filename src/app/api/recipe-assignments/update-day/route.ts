import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// PATCH update assignment day and meal type
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assignmentId, dayOfWeek, mealType } = await request.json();

    if (!assignmentId || dayOfWeek === undefined || dayOfWeek === null || !mealType) {
      return NextResponse.json(
        { error: 'assignmentId, dayOfWeek e mealType sono richiesti' },
        { status: 400 }
      );
    }

    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json(
        { error: 'mealType deve essere "breakfast", "lunch" o "dinner"' },
        { status: 400 }
      );
    }

    db.prepare(
      'UPDATE recipe_day_assignments SET dayOfWeek = ?, mealType = ? WHERE id = ? AND householdId = ?'
    ).run(dayOfWeek, mealType, assignmentId, session.householdId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating assignment day:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento dell\'assegnazione' },
      { status: 500 }
    );
  }
}
