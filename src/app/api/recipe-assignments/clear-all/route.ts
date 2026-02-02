import { NextResponse } from 'next/server';
import db from '@/lib/db';

// DELETE clear all recipe assignments for the week
export async function DELETE() {
  try {
    db.prepare('DELETE FROM recipe_day_assignments').run();
    db.prepare('DELETE FROM eating_out_meals').run();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing all assignments:', error);
    return NextResponse.json(
      { error: 'Errore nella cancellazione delle assegnazioni' },
      { status: 500 }
    );
  }
}
