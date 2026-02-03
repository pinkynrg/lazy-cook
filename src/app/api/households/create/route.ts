import { NextRequest, NextResponse } from 'next/server';
import { getSession, switchActiveHousehold, createToken, setSessionCookie, getActiveHousehold } from '@/lib/auth';
import db from '@/lib/db';

// POST create new household
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Il nome deve essere lungo almeno 3 caratteri' },
        { status: 400 }
      );
    }

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create household
    const result = db.prepare('INSERT INTO households (name, inviteCode) VALUES (?, ?)')
      .run(name.trim(), inviteCode);

    const householdId = result.lastInsertRowid as number;

    // Add user as owner
    db.prepare(`
      INSERT INTO user_households (userId, householdId, role, isActive)
      VALUES (?, ?, 'owner', 0)
    `).run(session.userId, householdId);

    // Switch to new household
    switchActiveHousehold(session.userId, householdId);

    // Get the new active household
    const newActiveHousehold = getActiveHousehold(session.userId);
    if (!newActiveHousehold) {
      return NextResponse.json(
        { error: 'Errore nella creazione della famiglia' },
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
        id: householdId,
        name: name.trim(),
        inviteCode,
      }
    });
  } catch (error: any) {
    console.error('Error creating household:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione della famiglia' },
      { status: 500 }
    );
  }
}
