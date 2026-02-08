import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET task history
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const tasks = db.prepare(`
      SELECT 
        t.id,
        t.taskType,
        t.completedAt,
        u.username
      FROM household_tasks t
      JOIN users u ON t.userId = u.id
      WHERE t.householdId = ?
      AND date(t.completedAt) >= date('now', '-' || ? || ' days')
      ORDER BY t.completedAt DESC
    `).all(session.householdId, days);

    // Get stats by user
    const stats = db.prepare(`
      SELECT 
        u.username,
        t.taskType,
        COUNT(*) as count
      FROM household_tasks t
      JOIN users u ON t.userId = u.id
      WHERE t.householdId = ?
      AND date(t.completedAt) >= date('now', '-' || ? || ' days')
      GROUP BY u.username, t.taskType
    `).all(session.householdId, days);

    return NextResponse.json({ tasks, stats });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dei task' },
      { status: 500 }
    );
  }
}

// POST log a task
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { taskType, completedAt, userId } = await request.json();

    if (!taskType || !['shopping', 'cooking', 'dishes'].includes(taskType)) {
      return NextResponse.json(
        { error: 'taskType deve essere "shopping", "cooking" o "dishes"' },
        { status: 400 }
      );
    }

    // Use specified userId or default to session userId
    const taskUserId = userId || session.userId;

    // If completedAt is provided (backdating), use it. Otherwise use current time
    let result;
    if (completedAt) {
      // Backdate the task to a specific date
      result = db.prepare(`
        INSERT INTO household_tasks (householdId, userId, taskType, completedAt)
        VALUES (?, ?, ?, datetime(?))
      `).run(session.householdId, taskUserId, taskType, completedAt);
    } else {
      // Use current timestamp
      result = db.prepare(`
        INSERT INTO household_tasks (householdId, userId, taskType)
        VALUES (?, ?, ?)
      `).run(session.householdId, taskUserId, taskType);
    }

    return NextResponse.json({ 
      success: true,
      taskId: result.lastInsertRowid 
    });
  } catch (error: any) {
    console.error('Error logging task:', error);
    
    // Check for unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Questo task è già stato registrato per questa data' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Errore nella registrazione del task' },
      { status: 500 }
    );
  }
}

// DELETE a task
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId è richiesto' },
        { status: 400 }
      );
    }

    // Verify task belongs to the household before deleting
    db.prepare(`
      DELETE FROM household_tasks 
      WHERE id = ? AND householdId = ?
    `).run(taskId, session.householdId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Errore nella rimozione del task' },
      { status: 500 }
    );
  }
}
