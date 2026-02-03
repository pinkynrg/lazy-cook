import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword, createToken, setSessionCookie, getActiveHousehold } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Get user's active household
    const activeHousehold = getActiveHousehold(user.id);
    if (!activeHousehold) {
      return NextResponse.json(
        { error: 'No active household found' },
        { status: 500 }
      );
    }

    // Create session token
    const token = await createToken({
      userId: user.id,
      username: user.username,
      householdId: activeHousehold.householdId,
    });

    // Set session cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
