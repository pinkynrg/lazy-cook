import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = db.prepare('SELECT * FROM settings WHERE householdId = ?').get(session.householdId) as any;
    
    if (!settings) {
      // Initialize if missing for this household
      db.prepare(`
        INSERT INTO settings (
          householdId,
          familySize,
          enableBreakfast,
          enableLunch,
          enableDinner,
          currentPlanName,
          enableFamilyTasks,
          cookBreakfast,
          cookLunch,
          cookDinner,
          cleanBreakfast,
          cleanLunch,
          cleanDinner,
          autoExpandCurrentDayMobile
        ) VALUES (?, 2, 0, 1, 1, ?, 1, 0, 1, 1, 0, 1, 1, 1)
      `).run(session.householdId, 'Piano Settimanale');
      return NextResponse.json({ 
        familySize: 2,
        enableBreakfast: false,
        enableLunch: true,
        enableDinner: true,
        currentPlanName: 'Piano Settimanale',
        enableFamilyTasks: true,
        autoExpandCurrentDayMobile: true,
        cookBreakfast: false,
        cookLunch: true,
        cookDinner: true,
        cleanBreakfast: false,
        cleanLunch: true,
        cleanDinner: true
      });
    }

    return NextResponse.json({ 
      familySize: settings.familySize,
      enableBreakfast: !!settings.enableBreakfast,
      enableLunch: !!settings.enableLunch,
      enableDinner: !!settings.enableDinner,
      currentPlanName: settings.currentPlanName || 'Piano Settimanale',
      enableFamilyTasks: settings.enableFamilyTasks !== undefined ? !!settings.enableFamilyTasks : true,
      autoExpandCurrentDayMobile: settings.autoExpandCurrentDayMobile !== undefined ? !!settings.autoExpandCurrentDayMobile : true,
      cookBreakfast: !!settings.cookBreakfast,
      cookLunch: !!settings.cookLunch,
      cookDinner: !!settings.cookDinner,
      cleanBreakfast: !!settings.cleanBreakfast,
      cleanLunch: !!settings.cleanLunch,
      cleanDinner: !!settings.cleanDinner
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle impostazioni' },
      { status: 500 }
    );
  }
}

// PATCH or POST update settings
export async function PATCH(request: NextRequest) {
  return updateSettings(request);
}

export async function POST(request: NextRequest) {
  return updateSettings(request);
}

async function updateSettings(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      familySize,
      enableBreakfast,
      enableLunch,
      enableDinner,
      currentPlanName,
      enableFamilyTasks,
      autoExpandCurrentDayMobile,
      cookBreakfast,
      cookLunch,
      cookDinner,
      cleanBreakfast,
      cleanLunch,
      cleanDinner
    } = await request.json();

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
    if (currentPlanName !== undefined) {
      updates.push('currentPlanName = ?');
      params.push(currentPlanName);
    }
    if (enableFamilyTasks !== undefined) {
      updates.push('enableFamilyTasks = ?');
      params.push(enableFamilyTasks ? 1 : 0);
    }
    if (autoExpandCurrentDayMobile !== undefined) {
      updates.push('autoExpandCurrentDayMobile = ?');
      params.push(autoExpandCurrentDayMobile ? 1 : 0);
    }

    if (cookBreakfast !== undefined) {
      updates.push('cookBreakfast = ?');
      params.push(cookBreakfast ? 1 : 0);
    }
    if (cookLunch !== undefined) {
      updates.push('cookLunch = ?');
      params.push(cookLunch ? 1 : 0);
    }
    if (cookDinner !== undefined) {
      updates.push('cookDinner = ?');
      params.push(cookDinner ? 1 : 0);
    }
    if (cleanBreakfast !== undefined) {
      updates.push('cleanBreakfast = ?');
      params.push(cleanBreakfast ? 1 : 0);
    }
    if (cleanLunch !== undefined) {
      updates.push('cleanLunch = ?');
      params.push(cleanLunch ? 1 : 0);
    }
    if (cleanDinner !== undefined) {
      updates.push('cleanDinner = ?');
      params.push(cleanDinner ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = CURRENT_TIMESTAMP');
      const query = `UPDATE settings SET ${updates.join(', ')} WHERE householdId = ?`;
      params.push(session.householdId);
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
