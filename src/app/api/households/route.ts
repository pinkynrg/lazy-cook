import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserHouseholds } from '@/lib/auth';

// GET all households for current user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const households = getUserHouseholds(session.userId);

    return NextResponse.json({ households });
  } catch (error: any) {
    console.error('Error fetching households:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle famiglie' },
      { status: 500 }
    );
  }
}
