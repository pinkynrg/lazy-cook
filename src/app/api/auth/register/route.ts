import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername, createToken, setSessionCookie, getActiveHousehold } from '@/lib/auth';

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

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser(username, password);

    // Get user's active household
    const activeHousehold = getActiveHousehold(user.id);
    if (!activeHousehold) {
      return NextResponse.json(
        { error: 'Failed to create household' },
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
