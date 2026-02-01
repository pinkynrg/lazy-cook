import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET settings
export async function GET() {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
    
    if (!settings) {
      // Initialize if missing
      db.prepare('INSERT INTO settings (id, familySize) VALUES (1, 2)').run();
      return NextResponse.json({ familySize: 2 });
    }

    return NextResponse.json({ familySize: settings.familySize });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle impostazioni' },
      { status: 500 }
    );
  }
}

// PATCH update settings
export async function PATCH(request: NextRequest) {
  try {
    const { familySize } = await request.json();

    if (!familySize || familySize < 1) {
      return NextResponse.json(
        { error: 'familySize deve essere almeno 1' },
        { status: 400 }
      );
    }

    db.prepare('UPDATE settings SET familySize = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 1')
      .run(familySize);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento delle impostazioni' },
      { status: 500 }
    );
  }
}
