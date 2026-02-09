import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

function normalizeNickname(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  // Keep it short/clean for UI (and prevent abuse)
  if (s.length > 32) return s.slice(0, 32);
  return s;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = db.prepare(`SELECT id, username, nickname FROM users WHERE id = ?`).get(session.userId) as any;
  if (!row) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: Number(row.id),
      username: String(row.username),
      nickname: row.nickname !== undefined ? (row.nickname === null ? null : String(row.nickname)) : null,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const nickname = normalizeNickname(body?.nickname);

    db.prepare(`UPDATE users SET nickname = ? WHERE id = ?`).run(nickname, session.userId);

    return NextResponse.json({ ok: true, nickname });
  } catch (error) {
    console.error('Error updating nickname:', error);
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 });
  }
}
