import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// PATCH update recipe day
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, dayOfWeek } = await request.json();

    db.prepare('UPDATE recipes SET dayOfWeek = ? WHERE id = ? AND householdId = ?').run(
      dayOfWeek,
      id,
      session.householdId
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating recipe day:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del giorno' },
      { status: 500 }
    );
  }
}
