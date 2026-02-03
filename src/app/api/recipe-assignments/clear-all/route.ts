import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// DELETE or POST clear all recipe assignments for the week
export async function DELETE() {
  return clearAll();
}

export async function POST() {
  return clearAll();
}

async function clearAll() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    db.prepare('DELETE FROM recipe_day_assignments WHERE householdId = ?').run(session.householdId);
    db.prepare('DELETE FROM eating_out_meals WHERE householdId = ?').run(session.householdId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing all assignments:', error);
    return NextResponse.json(
      { error: 'Errore nella cancellazione delle assegnazioni' },
      { status: 500 }
    );
  }
}
