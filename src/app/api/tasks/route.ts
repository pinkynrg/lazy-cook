import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
type MealType = (typeof MEAL_TYPES)[number];
type MealTaskAction = 'cook' | 'clean';

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toLegacySafeMeal(settingsRow: any, action: MealTaskAction): MealType {
  const meals: MealType[] = ['dinner', 'lunch', 'breakfast'];
  for (const meal of meals) {
    const key = action === 'cook' ? `cook${meal[0].toUpperCase()}${meal.slice(1)}` : `clean${meal[0].toUpperCase()}${meal.slice(1)}`;
    if (settingsRow && settingsRow[key] !== undefined) {
      if (!!settingsRow[key]) return meal;
      continue;
    }
    // If settings column missing (older DB), prefer dinner/lunch.
    if (meal !== 'breakfast') return meal;
  }
  return 'dinner';
}

function normalizeTaskType(taskType: string, settingsRow: any) {
  if (taskType === 'cooking') {
    const meal = toLegacySafeMeal(settingsRow, 'cook');
    return `${meal}_cook`;
  }
  if (taskType === 'dishes') {
    const meal = toLegacySafeMeal(settingsRow, 'clean');
    return `${meal}_clean`;
  }
  return taskType;
}

function isAllowedTaskType(taskType: string) {
  if (taskType === 'shopping') return true;
  if (taskType === 'cooking' || taskType === 'dishes') return true; // legacy inputs
  return /^(breakfast|lunch|dinner)_(cook|clean)$/.test(taskType);
}

// GET tasks (for range/table)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeTotals = searchParams.get('includeTotals') === '1';

    const all = searchParams.get('all') === '1';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const daysParam = searchParams.get('days');
    const days = parseInt(daysParam || '7');

    const settingsRow = db.prepare('SELECT * FROM settings WHERE householdId = ?').get(session.householdId) as any;

    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (all) {
      const minRow = db.prepare(`
        SELECT MIN(date(completedAt)) as minDate
        FROM household_tasks
        WHERE householdId = ?
      `).get(session.householdId) as any;
      fromDate = (minRow && minRow.minDate) ? String(minRow.minDate) : null;
      toDate = new Date().toISOString().slice(0, 10);
    } else if (fromParam && toParam && isIsoDate(fromParam) && isIsoDate(toParam)) {
      fromDate = fromParam;
      toDate = toParam;
    } else {
      // Fallback to last N days
      toDate = new Date().toISOString().slice(0, 10);
      const d = new Date();
      d.setDate(d.getDate() - days);
      fromDate = d.toISOString().slice(0, 10);
    }

    const tasksQuery = `
      SELECT
        t.id,
        t.taskType,
        t.completedAt,
        date(t.completedAt) as dateStr,
        t.userId,
        u.username,
        u.nickname,
        COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) as displayName
      FROM household_tasks t
      JOIN users u ON t.userId = u.id
      WHERE t.householdId = ?
      AND date(t.completedAt) >= date(?)
      AND date(t.completedAt) <= date(?)
      ORDER BY t.completedAt DESC
    `;

    const rawTasks = db.prepare(tasksQuery).all(session.householdId, fromDate, toDate) as any[];
    const tasks = rawTasks.map(t => ({
      ...t,
      taskType: normalizeTaskType(t.taskType, settingsRow)
    }));

    if (!includeTotals) {
      return NextResponse.json({ tasks, from: fromDate, to: toDate });
    }

    const totalsByTaskTypeRange = db.prepare(`
      SELECT taskType, COUNT(*) as count
      FROM household_tasks
      WHERE householdId = ?
      AND date(completedAt) >= date(?)
      AND date(completedAt) <= date(?)
      GROUP BY taskType
    `).all(session.householdId, fromDate, toDate) as any[];

    const totalsByTaskTypeAll = db.prepare(`
      SELECT taskType, COUNT(*) as count
      FROM household_tasks
      WHERE householdId = ?
      GROUP BY taskType
    `).all(session.householdId) as any[];

    const totalsByUserRange = db.prepare(`
      SELECT userId,
        u.username as username,
        u.nickname as nickname,
        COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) as displayName,
        COUNT(*) as count
      FROM household_tasks t
      JOIN users u ON t.userId = u.id
      WHERE t.householdId = ?
      AND date(t.completedAt) >= date(?)
      AND date(t.completedAt) <= date(?)
      GROUP BY userId
      ORDER BY count DESC
    `).all(session.householdId, fromDate, toDate) as any[];

    const totalsByUserTaskTypeRange = db.prepare(`
      SELECT t.userId as userId,
        u.username as username,
        u.nickname as nickname,
        COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) as displayName,
        t.taskType as taskType,
        COUNT(*) as count
      FROM household_tasks t
      JOIN users u ON t.userId = u.id
      WHERE t.householdId = ?
      AND date(t.completedAt) >= date(?)
      AND date(t.completedAt) <= date(?)
      GROUP BY t.userId, t.taskType
    `).all(session.householdId, fromDate, toDate) as any[];

    const totalsByUserAll = db.prepare(`
      SELECT userId,
        u.username as username,
        u.nickname as nickname,
        COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) as displayName,
        COUNT(*) as count
      FROM household_tasks t
      JOIN users u ON t.userId = u.id
      WHERE t.householdId = ?
      GROUP BY userId
      ORDER BY count DESC
    `).all(session.householdId) as any[];

    const totalsByUserTaskTypeAll = db.prepare(`
      SELECT t.userId as userId,
        u.username as username,
        u.nickname as nickname,
        COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) as displayName,
        t.taskType as taskType,
        COUNT(*) as count
      FROM household_tasks t
      JOIN users u ON t.userId = u.id
      WHERE t.householdId = ?
      GROUP BY t.userId, t.taskType
    `).all(session.householdId) as any[];

    const normalizeTotals = (rows: any[]) => {
      const out: Record<string, number> = {};
      for (const r of rows) {
        const type = normalizeTaskType(String(r.taskType), settingsRow);
        out[type] = (out[type] || 0) + Number(r.count || 0);
      }
      return out;
    };

    const normalizeUserTaskType = (rows: any[]) => {
      return rows.map(r => ({
        userId: Number(r.userId),
        username: String(r.displayName || r.username),
        taskType: normalizeTaskType(String(r.taskType), settingsRow),
        count: Number(r.count || 0)
      }));
    };

    return NextResponse.json({
      tasks,
      from: fromDate,
      to: toDate,
      totals: {
        byTaskType: {
          range: normalizeTotals(totalsByTaskTypeRange),
          all: normalizeTotals(totalsByTaskTypeAll)
        },
        byUser: {
          range: totalsByUserRange,
          all: totalsByUserAll
        },
        byUserTaskType: {
          range: normalizeUserTaskType(totalsByUserTaskTypeRange),
          all: normalizeUserTaskType(totalsByUserTaskTypeAll)
        }
      }
    });
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

    const settingsRow = db.prepare('SELECT * FROM settings WHERE householdId = ?').get(session.householdId) as any;
    const normalizedTaskType = normalizeTaskType(taskType, settingsRow);

    if (!normalizedTaskType || !isAllowedTaskType(normalizedTaskType)) {
      return NextResponse.json(
        { error: 'taskType non valido' },
        { status: 400 }
      );
    }

    // Use specified userId or default to session userId
    const taskUserId = userId || session.userId;

    const dateToUse = completedAt && isIsoDate(completedAt) ? completedAt : null;

    const tx = db.transaction(() => {
      if (dateToUse) {
        const res = db.prepare(`
          INSERT INTO household_tasks (householdId, userId, taskType, completedAt)
          VALUES (?, ?, ?, datetime(?))
        `).run(session.householdId, taskUserId, normalizedTaskType, dateToUse);
        return res;
      }

      const res = db.prepare(`
        INSERT INTO household_tasks (householdId, userId, taskType)
        VALUES (?, ?, ?)
      `).run(session.householdId, taskUserId, normalizedTaskType);
      return res;
    });

    const result = tx();

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

// PUT replace participants for a given date/taskType
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { dateStr, taskType, userIds } = await request.json();

    if (!dateStr || !isIsoDate(String(dateStr))) {
      return NextResponse.json({ error: 'dateStr non valido' }, { status: 400 });
    }

    const settingsRow = db.prepare('SELECT * FROM settings WHERE householdId = ?').get(session.householdId) as any;
    const normalizedTaskType = normalizeTaskType(String(taskType), settingsRow);
    if (!normalizedTaskType || !isAllowedTaskType(normalizedTaskType)) {
      return NextResponse.json({ error: 'taskType non valido' }, { status: 400 });
    }

    const ids: number[] = Array.isArray(userIds)
      ? userIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
      : [];

    const uniqueIds = Array.from(new Set(ids));

    const tx = db.transaction(() => {
      db.prepare(`
        DELETE FROM household_tasks
        WHERE householdId = ?
        AND taskType = ?
        AND date(completedAt) = date(?)
      `).run(session.householdId, normalizedTaskType, dateStr);

      if (uniqueIds.length === 0) return;

      const insert = db.prepare(`
        INSERT INTO household_tasks (householdId, userId, taskType, completedAt)
        VALUES (?, ?, ?, datetime(?))
      `);

      for (const uid of uniqueIds) {
        insert.run(session.householdId, uid, normalizedTaskType, dateStr);
      }
    });

    tx();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error updating task participants:', error);
    return NextResponse.json(
      { error: 'Errore nel salvataggio' },
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
    const body = await request.json();
    const taskId = body?.taskId;
    const dateStr = body?.dateStr;
    const taskType = body?.taskType;
    const userId = body?.userId;
    const from = body?.from;
    const to = body?.to;
    const taskTypes = body?.taskTypes as string[] | undefined;

    const settingsRow = db.prepare('SELECT * FROM settings WHERE householdId = ?').get(session.householdId) as any;

    if (taskId) {
      db.prepare(`
        DELETE FROM household_tasks
        WHERE id = ? AND householdId = ?
      `).run(taskId, session.householdId);
      return NextResponse.json({ success: true });
    }

    if (dateStr && taskType && isIsoDate(dateStr)) {
      const normalizedTaskType = normalizeTaskType(taskType, settingsRow);
      if (userId) {
        db.prepare(`
          DELETE FROM household_tasks
          WHERE householdId = ?
          AND taskType = ?
          AND date(completedAt) = date(?)
          AND userId = ?
        `).run(session.householdId, normalizedTaskType, dateStr, Number(userId));
      } else {
        db.prepare(`
          DELETE FROM household_tasks
          WHERE householdId = ?
          AND taskType = ?
          AND date(completedAt) = date(?)
        `).run(session.householdId, normalizedTaskType, dateStr);
      }
      return NextResponse.json({ success: true });
    }

    if (from && to && isIsoDate(from) && isIsoDate(to)) {
      if (Array.isArray(taskTypes) && taskTypes.length > 0) {
        const normalized = taskTypes
          .filter(Boolean)
          .map(t => normalizeTaskType(t, settingsRow))
          .filter(t => isAllowedTaskType(t));

        if (normalized.length === 0) {
          return NextResponse.json(
            { error: 'taskTypes non validi' },
            { status: 400 }
          );
        }

        const placeholders = normalized.map(() => '?').join(',');
        db.prepare(`
          DELETE FROM household_tasks
          WHERE householdId = ?
          AND date(completedAt) >= date(?)
          AND date(completedAt) <= date(?)
          AND taskType IN (${placeholders})
        `).run(session.householdId, from, to, ...normalized);
      } else {
        db.prepare(`
          DELETE FROM household_tasks
          WHERE householdId = ?
          AND date(completedAt) >= date(?)
          AND date(completedAt) <= date(?)
        `).run(session.householdId, from, to);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Richiesta non valida' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Errore nella rimozione del task' },
      { status: 500 }
    );
  }
}
