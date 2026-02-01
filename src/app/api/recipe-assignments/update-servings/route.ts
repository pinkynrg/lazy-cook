import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PATCH update assignment servings
export async function PATCH(request: NextRequest) {
  try {
    const { assignmentId, plannedServings } = await request.json();

    if (!assignmentId || !plannedServings || plannedServings < 1) {
      return NextResponse.json(
        { error: 'assignmentId e plannedServings valido sono richiesti' },
        { status: 400 }
      );
    }

    db.prepare('UPDATE recipe_day_assignments SET plannedServings = ? WHERE id = ?')
      .run(plannedServings, assignmentId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating assignment servings:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento delle porzioni' },
      { status: 500 }
    );
  }
}
