import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PATCH update assignment day and meal type
export async function PATCH(request: NextRequest) {
  try {
    const { assignmentId, dayOfWeek, mealType } = await request.json();

    if (!assignmentId || dayOfWeek === undefined || dayOfWeek === null || !mealType) {
      return NextResponse.json(
        { error: 'assignmentId, dayOfWeek e mealType sono richiesti' },
        { status: 400 }
      );
    }

    if (!['lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json(
        { error: 'mealType deve essere "lunch" o "dinner"' },
        { status: 400 }
      );
    }

    db.prepare(
      'UPDATE recipe_day_assignments SET dayOfWeek = ?, mealType = ? WHERE id = ?'
    ).run(dayOfWeek, mealType, assignmentId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating assignment day:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento dell\'assegnazione' },
      { status: 500 }
    );
  }
}
