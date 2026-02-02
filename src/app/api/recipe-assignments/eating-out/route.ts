import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET all eating out meals
export async function GET() {
  try {
    const eatingOutMeals = db.prepare('SELECT * FROM eating_out_meals').all();
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
        'DELETE FROM recipe_day_assignments WHERE dayOfWeek = ? AND mealType = ?'
      ).run(dayOfWeek, mealType);
      
      // Insert eating out record
      db.prepare(
        'INSERT OR IGNORE INTO eating_out_meals (dayOfWeek, mealType) VALUES (?, ?)'
      ).run(dayOfWeek, mealType);
    } else {
      // Remove the eating out record
      db.prepare(
        'DELETE FROM eating_out_meals WHERE dayOfWeek = ? AND mealType = ?'
      ).run(dayOfWeek, mealType);
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
