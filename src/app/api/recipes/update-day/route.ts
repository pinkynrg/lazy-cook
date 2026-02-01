import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PATCH update recipe day
export async function PATCH(request: NextRequest) {
  try {
    const { id, dayOfWeek } = await request.json();

    db.prepare('UPDATE recipes SET dayOfWeek = ? WHERE id = ?').run(
      dayOfWeek,
      id
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
