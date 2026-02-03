import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET all eating out meals
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const eatingOutMeals = db.prepare('SELECT * FROM eating_out_meals WHERE householdId = ?').all(session.householdId);
    return NextResponse.json({ eatingOutMeals });
  } catch (error: any) {
    console.error('Error fetching eating out meals:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei pasti fuori' },
      { status: 500 }
    );
  }
}

// POST toggle eating out status for a meal
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { dayOfWeek, mealType, eatingOut } = await request.json();

    if (dayOfWeek === undefined || dayOfWeek === null || !mealType) {
      return NextResponse.json(
        { error: 'dayOfWeek e mealType sono richiesti' },
        { status: 400 }
      );
    }

    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json(
        { error: 'mealType deve essere "breakfast", "lunch" o "dinner"' },
        { status: 400 }
      );
    }

    if (eatingOut) {
      // When marking as eating out, delete all recipe assignments for this day/meal
      db.prepare(
        'DELETE FROM recipe_day_assignments WHERE dayOfWeek = ? AND mealType = ? AND householdId = ?'
      ).run(dayOfWeek, mealType, session.householdId);
      
      // Insert eating out record
      db.prepare(
        'INSERT OR IGNORE INTO eating_out_meals (dayOfWeek, mealType, householdId) VALUES (?, ?, ?)'
      ).run(dayOfWeek, mealType, session.householdId);
    } else {
      // Remove the eating out record
      db.prepare(
        'DELETE FROM eating_out_meals WHERE dayOfWeek = ? AND mealType = ? AND householdId = ?'
      ).run(dayOfWeek, mealType, session.householdId);
    }

    return NextResponse.json({ success: true, eatingOut: eatingOut ? 1 : 0 });
  } catch (error: any) {
    console.error('Error toggling eating out:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento dello stato' },
      { status: 500 }
    );
  }
}
