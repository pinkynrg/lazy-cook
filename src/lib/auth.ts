import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import db from './db';
import { verifyToken as verifyTokenEdge } from './auth-edge';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const JWT_COOKIE_NAME = 'auth-token';

export interface User {
  id: number;
  username: string;
}

export interface SessionPayload {
  userId: number;
  username: string;
  householdId: number;
  exp: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export async function createToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const token = await new SignJWT({ userId: payload.userId, username: payload.username, householdId: payload.householdId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  return verifyTokenEdge(token);
}

// Get current session
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(JWT_COOKIE_NAME);
}

// Get user by ID
export function getUserById(id: number): User | null {
  const stmt = db.prepare('SELECT id, username FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined || null;
}

// Get user by username
export function getUserByUsername(username: string): (User & { password: string }) | null {
  const stmt = db.prepare('SELECT id, username, password FROM users WHERE username = ?');
  return stmt.get(username) as (User & { password: string }) | undefined || null;
}

// Create user
export async function createUser(username: string, password: string): Promise<User> {
  const hashedPassword = await hashPassword(password);
  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  const result = stmt.run(username, hashedPassword);
  
  const userId = result.lastInsertRowid as number;

  // Create default household for new user
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const householdStmt = db.prepare('INSERT INTO households (name, inviteCode) VALUES (?, ?)');
  const householdResult = householdStmt.run(`${username}'s Household`, inviteCode);
  const householdId = householdResult.lastInsertRowid as number;

  // Link user to household
  db.prepare(`
    INSERT INTO user_households (userId, householdId, role, isActive)
    VALUES (?, ?, 'owner', 1)
  `).run(userId, householdId);

  return {
    id: userId,
    username,
  };
}

// Get active household for user
export function getActiveHousehold(userId: number): { householdId: number; role: string } | null {
  const stmt = db.prepare(`
    SELECT householdId, role FROM user_households
    WHERE userId = ? AND isActive = 1
    LIMIT 1
  `);
  return stmt.get(userId) as { householdId: number; role: string } | undefined || null;
}

// Get all households for user
export function getUserHouseholds(userId: number): any[] {
  const stmt = db.prepare(`
    SELECT h.id, h.name, h.inviteCode, uh.role, uh.isActive, uh.joinedAt
    FROM households h
    JOIN user_households uh ON h.id = uh.householdId
    WHERE uh.userId = ?
    ORDER BY uh.isActive DESC, uh.joinedAt DESC
  `);
  return stmt.all(userId) as any[];
}

// Switch active household
export function switchActiveHousehold(userId: number, householdId: number): boolean {
  try {
    // Deactivate all households for user
    db.prepare('UPDATE user_households SET isActive = 0 WHERE userId = ?').run(userId);
    // Activate selected household
    db.prepare('UPDATE user_households SET isActive = 1 WHERE userId = ? AND householdId = ?')
      .run(userId, householdId);
    return true;
  } catch (error) {
    return false;
  }
}
