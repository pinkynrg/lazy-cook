import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserHouseholds } from '@/lib/auth';
import db from '@/lib/db';

// GET all households for current user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const households = getUserHouseholds(session.userId);

    // Also get members of the current active household
    const members = db.prepare(`
      SELECT
        u.id,
        u.username,
        u.nickname,
        COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) as displayName
      FROM users u
      JOIN user_households uh ON u.id = uh.userId
      WHERE uh.householdId = ?
      ORDER BY displayName
    `).all(session.householdId);

    return NextResponse.json({ households, members });
  } catch (error: any) {
    console.error('Error fetching households:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle famiglie' },
      { status: 500 }
    );
  }
}
