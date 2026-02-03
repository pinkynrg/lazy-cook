import { NextRequest, NextResponse } from 'next/server';
import { getSession, switchActiveHousehold, createToken, setSessionCookie, getActiveHousehold } from '@/lib/auth';
import db from '@/lib/db';

// POST join household via invite code
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Codice invito richiesto' },
        { status: 400 }
      );
    }

    // Find household by invite code
    const household = db.prepare('SELECT id, name FROM households WHERE inviteCode = ?')
      .get(inviteCode.toUpperCase()) as any;

    if (!household) {
      return NextResponse.json(
        { error: 'Codice invito non valido' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMembership = db.prepare(`
      SELECT id FROM user_households WHERE userId = ? AND householdId = ?
    `).get(session.userId, household.id);

    if (existingMembership) {
      // Already a member, just switch to it
      switchActiveHousehold(session.userId, household.id);
    } else {
      // Add user to household
      db.prepare(`
        INSERT INTO user_households (userId, householdId, role, isActive)
        VALUES (?, ?, 'member', 0)
      `).run(session.userId, household.id);

      // Switch to new household
      switchActiveHousehold(session.userId, household.id);
    }

    // Get the new active household
    const newActiveHousehold = getActiveHousehold(session.userId);
    if (!newActiveHousehold) {
      return NextResponse.json(
        { error: 'Errore nell\'unione alla famiglia' },
        { status: 500 }
      );
    }

    // Create new session token with updated householdId
    const token = await createToken({
      userId: session.userId,
      username: session.username,
      householdId: newActiveHousehold.householdId,
    });

    // Set new session cookie
    await setSessionCookie(token);

    return NextResponse.json({ 
      success: true,
      household: {
        id: household.id,
        name: household.name,
      }
    });
  } catch (error: any) {
    console.error('Error joining household:', error);
    return NextResponse.json(
      { error: 'Errore nell\'unione alla famiglia' },
      { status: 500 }
    );
  }
}
