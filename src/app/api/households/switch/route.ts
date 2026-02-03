import { NextRequest, NextResponse } from 'next/server';
import { getSession, switchActiveHousehold, createToken, setSessionCookie, getActiveHousehold } from '@/lib/auth';

// POST switch active household
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { householdId } = await request.json();

    if (!householdId) {
      return NextResponse.json(
        { error: 'ID famiglia richiesto' },
        { status: 400 }
      );
    }

    // Switch active household
    const success = switchActiveHousehold(session.userId, householdId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Impossibile cambiare famiglia' },
        { status: 400 }
      );
    }

    // Get the new active household to verify
    const newActiveHousehold = getActiveHousehold(session.userId);
    if (!newActiveHousehold) {
      return NextResponse.json(
        { error: 'Errore nel cambio famiglia' },
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
      householdId: newActiveHousehold.householdId 
    });
  } catch (error: any) {
    console.error('Error switching household:', error);
    return NextResponse.json(
      { error: 'Errore nel cambio famiglia' },
      { status: 500 }
    );
  }
}
