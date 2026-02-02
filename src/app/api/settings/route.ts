import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET settings
export async function GET() {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
    
    if (!settings) {
      // Initialize if missing
      db.prepare('INSERT INTO settings (id, familySize, enableBreakfast, enableLunch, enableDinner) VALUES (1, 2, 0, 1, 1)').run();
      return NextResponse.json({ 
        familySize: 2,
        enableBreakfast: false,
        enableLunch: true,
        enableDinner: true
      });
    }

    return NextResponse.json({ 
      familySize: settings.familySize,
      enableBreakfast: !!settings.enableBreakfast,
      enableLunch: !!settings.enableLunch,
      enableDinner: !!settings.enableDinner
    });
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
    const { familySize, enableBreakfast, enableLunch, enableDinner } = await request.json();

    if (familySize !== undefined && (familySize < 1)) {
      return NextResponse.json(
        { error: 'familySize deve essere almeno 1' },
        { status: 400 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (familySize !== undefined) {
      updates.push('familySize = ?');
      params.push(familySize);
    }
    if (enableBreakfast !== undefined) {
      updates.push('enableBreakfast = ?');
      params.push(enableBreakfast ? 1 : 0);
    }
    if (enableLunch !== undefined) {
      updates.push('enableLunch = ?');
      params.push(enableLunch ? 1 : 0);
    }
    if (enableDinner !== undefined) {
      updates.push('enableDinner = ?');
      params.push(enableDinner ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = CURRENT_TIMESTAMP');
      const query = `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`;
      db.prepare(query).run(...params);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento delle impostazioni' },
      { status: 500 }
    );
  }
}
