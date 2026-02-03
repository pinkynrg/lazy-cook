import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface SessionPayload {
  userId: number;
  username: string;
  householdId: number;
  exp: number;
}

// Verify JWT token (Edge compatible)
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Validate that payload has required fields
    if (
      typeof payload.userId === 'number' &&
      typeof payload.username === 'string' &&
      typeof payload.householdId === 'number' &&
      typeof payload.exp === 'number'
    ) {
      return payload as unknown as SessionPayload;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
