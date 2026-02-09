'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Settings } from '@/types/recipe';
import styles from './FamilyTasksTable.module.scss';

type RangePreset = 'week' | '2weeks' | 'month';

type MealType = 'breakfast' | 'lunch' | 'dinner';

type TaskSlot = {
  key: string; // e.g. "lunch_cook"
  meal: MealType;
  action: 'cook' | 'clean';
  label: string;
};

type HouseholdMember = {
  id: number;
  username: string;
};

type TaskRow = {
  id: number;
  taskType: string;
  completedAt: string;
  dateStr: string;
  userId: number;
  username: string;
};

type TotalsResponse = {
  byTaskType: {
    range: Record<string, number>;
    all: Record<string, number>;
  };
  byUser: {
    range: Array<{ userId: number; username: string; count: number }>;
    all: Array<{ userId: number; username: string; count: number }>;
  };
  byUserTaskType?: {
    range: Array<{ userId: number; username: string; taskType: string; count: number }>;
    all: Array<{ userId: number; username: string; taskType: string; count: number }>;
  };
};

function isoDate(date: Date) {
  // Use local date parts (avoid UTC conversion shifting the day).
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateIt(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

function mealLabel(meal: MealType) {
  if (meal === 'breakfast') return 'Colazione';
  if (meal === 'lunch') return 'Pranzo';
  return 'Cena';
}

function actionLabel(action: 'cook' | 'clean') {
  return action === 'cook' ? 'Cucina' : 'Piatti';
}

function buildSlots(settings: Settings | null): TaskSlot[] {
  const enableBreakfast = !!settings?.enableBreakfast;
  const enableLunch = settings?.enableLunch !== undefined ? !!settings.enableLunch : true;
  const enableDinner = settings?.enableDinner !== undefined ? !!settings.enableDinner : true;

  const cookBreakfast = !!settings?.cookBreakfast;
  const cookLunch = settings?.cookLunch !== undefined ? !!settings.cookLunch : true;
  const cookDinner = settings?.cookDinner !== undefined ? !!settings.cookDinner : true;
  const cleanBreakfast = !!settings?.cleanBreakfast;
  const cleanLunch = settings?.cleanLunch !== undefined ? !!settings.cleanLunch : true;
  const cleanDinner = settings?.cleanDinner !== undefined ? !!settings.cleanDinner : true;

  const meals: Array<{ meal: MealType; enabled: boolean; cook: boolean; clean: boolean }> = [
    { meal: 'breakfast', enabled: enableBreakfast, cook: cookBreakfast, clean: cleanBreakfast },
    { meal: 'lunch', enabled: enableLunch, cook: cookLunch, clean: cleanLunch },
    { meal: 'dinner', enabled: enableDinner, cook: cookDinner, clean: cleanDinner },
  ];

  const slots: TaskSlot[] = [];
  for (const m of meals) {
    if (!m.enabled) continue;
    if (m.cook) {
      slots.push({
        key: `${m.meal}_cook`,
        meal: m.meal,
        action: 'cook',
        label: `${mealLabel(m.meal)} · ${actionLabel('cook')}`,
      });
    }
    if (m.clean) {
      slots.push({
        key: `${m.meal}_clean`,
        meal: m.meal,
        action: 'clean',
        label: `${mealLabel(m.meal)} · ${actionLabel('clean')}`,
      });
    }
  }
  return slots;
}

export default function FamilyTasksTable() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const [preset, setPreset] = useState<RangePreset>('week');

  const [loading, setLoading] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [totals, setTotals] = useState<TotalsResponse | null>(null);

  const slots = useMemo(() => buildSlots(settings), [settings]);

  const range = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = preset === 'week' ? 7 : preset === '2weeks' ? 14 : 28;
    const start = addDays(today, -(days - 1));
    return { from: isoDate(start), to: isoDate(today), days };
  }, [preset]);

  const datesInRange = useMemo(() => {
    const start = new Date(range.from + 'T00:00:00');
    const out: string[] = [];
    for (let i = 0; i < range.days; i++) {
      out.push(isoDate(addDays(start, i)));
    }
    // Descending by date (newest first)
    return out.reverse();
  }, [range.from, range.days]);

  const tasksByCell = useMemo(() => {
    const map = new Map<string, TaskRow>();
    for (const t of tasks) {
      map.set(`${t.dateStr}-${t.taskType}`, t);
    }
    return map;
  }, [tasks]);

  const grandTotalsByUser = useMemo(() => {
    const rows = totals?.byUserTaskType?.all ?? [];

    const enabledCook = new Set(slots.filter(s => s.action === 'cook').map(s => s.key));
    const enabledClean = new Set(slots.filter(s => s.action === 'clean').map(s => s.key));

    const map = new Map<number, { userId: number; username: string; cookAll: number; cleanAll: number }>();

    for (const r of rows) {
      if (!map.has(r.userId)) {
        map.set(r.userId, { userId: r.userId, username: r.username, cookAll: 0, cleanAll: 0 });
      }
      const entry = map.get(r.userId)!;
      if (enabledCook.has(r.taskType)) entry.cookAll += r.count;
      if (enabledClean.has(r.taskType)) entry.cleanAll += r.count;
    }

    // Ensure each household member is present, even if 0
    for (const m of members) {
      if (!map.has(m.id)) map.set(m.id, { userId: m.id, username: m.username, cookAll: 0, cleanAll: 0 });
    }

    return Array.from(map.values()).sort((a, b) => (b.cookAll + b.cleanAll) - (a.cookAll + a.cleanAll));
  }, [totals, slots, members]);

  useEffect(() => {
    (async () => {
      try {
        const [settingsRes, membersRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/households'),
        ]);

        if (settingsRes.ok) {
          setSettings(await settingsRes.json());
        }

        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.members || []);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      url.searchParams.set('includeTotals', '1');
      url.searchParams.set('from', range.from);
      url.searchParams.set('to', range.to);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Errore nel recupero dei task');
      }

      setTasks(data.tasks || []);
      setTotals(data.totals || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load tasks when range changes and we already have members/settings.
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const upsertCell = async (dateStr: string, taskType: string, userId: number | null) => {
    const cellKey = `${dateStr}-${taskType}`;
    setSavingCell(cellKey);
    setError(null);
    try {
      if (userId === null) {
        await fetch('/api/tasks', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateStr, taskType }),
        });
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskType, completedAt: dateStr, userId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Errore nel salvataggio');
        }
      }
      await loadTasks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setSavingCell(null);
    }
  };

  const renderDesktopTable = () => {
    return (
      <div className={styles.tableScroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.stickyCol}>Data</th>
              {slots.map(slot => {
                return (
                  <th key={slot.key}>
                    <div className={styles.colHeader}>
                      <div className={styles.colTitle}>{slot.label}</div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {datesInRange.map(dateStr => (
              <tr key={dateStr}>
                <td className={styles.stickyCol}>
                  <div className={styles.dateCell}>
                    <div className={styles.dateMain}>{formatDateIt(dateStr)}</div>
                    <div className={styles.dateIso}>{dateStr}</div>
                  </div>
                </td>
                {slots.map(slot => {
                  const cellKey = `${dateStr}-${slot.key}`;
                  const row = tasksByCell.get(cellKey);
                  const value = row?.userId ? String(row.userId) : '';
                  const isSaving = savingCell === cellKey;
                  return (
                    <td key={slot.key} className={row ? styles.filledCell : styles.emptyCell}>
                      <select
                        className={styles.select}
                        value={value}
                        disabled={loading || isSaving}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) {
                            void upsertCell(dateStr, slot.key, null);
                          } else {
                            void upsertCell(dateStr, slot.key, Number(v));
                          }
                        }}
                      >
                        <option value="">—</option>
                        {members.map(m => (
                          <option key={m.id} value={String(m.id)}>{m.username}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };


  const renderMobileCards = () => {
    return (
      <div className={styles.mobileList}>
        {datesInRange.map(dateStr => (
          <div key={dateStr} className={styles.dayCard}>
            <div className={styles.dayHeader}>
              <div className={styles.dayTitle}>{formatDateIt(dateStr)}</div>
              <div className={styles.dayIso}>{dateStr}</div>
            </div>

            <div className={styles.dayBody}>
              {slots.map(slot => {
                const cellKey = `${dateStr}-${slot.key}`;
                const row = tasksByCell.get(cellKey);
                const value = row?.userId ? String(row.userId) : '';
                const isSaving = savingCell === cellKey;
                return (
                  <div key={slot.key} className={styles.mobileRow}>
                    <div className={styles.mobileLabel}>{slot.label}</div>
                    <select
                      className={styles.select}
                      value={value}
                      disabled={loading || isSaving}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          void upsertCell(dateStr, slot.key, null);
                        } else {
                          void upsertCell(dateStr, slot.key, Number(v));
                        }
                      }}
                    >
                      <option value="">—</option>
                      {members.map(m => (
                        <option key={m.id} value={String(m.id)}>{m.username}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>📅 Task Familiari</h2>
          <div className={styles.subtitle}>Compila e consulta chi ha fatto cosa, giorno per giorno.</div>
        </div>

        <div className={styles.controls}>
          <label className={styles.control}>
            <span>Periodo</span>
            <select value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)}>
              <option value="week">Ultimi 7 giorni</option>
              <option value="2weeks">Ultimi 14 giorni</option>
              <option value="month">Ultimi 28 giorni</option>
            </select>
          </label>
        </div>
      </div>

      {slots.length > 0 && (
        <div className={styles.tableBlock}>
          <div className={styles.blockHeader}>
            <div className={styles.blockTitle}>Totali per persona</div>
          </div>
          <div className={styles.summaryDesktop}>
            <div className={`${styles.tableScroller} ${styles.summaryScroller}`}>
              <table className={`${styles.table} ${styles.summaryTable}`}>
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th className={styles.num}>Cucina</th>
                    <th className={styles.num}>Piatti</th>
                    <th className={styles.num}>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {grandTotalsByUser.map(u => (
                    <tr key={u.userId}>
                      <td className={styles.person} title={u.username}>{u.username}</td>
                      <td className={styles.num}>{u.cookAll}</td>
                      <td className={styles.num}>{u.cleanAll}</td>
                      <td className={styles.numStrong}>{u.cookAll + u.cleanAll}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.summaryMobile}>
            <div className={styles.summaryCards}>
              {grandTotalsByUser.map(u => (
                <div key={u.userId} className={styles.summaryCard}>
                  <div className={styles.summaryPerson} title={u.username}>{u.username}</div>
                  <div className={styles.summaryNums}>
                    <div className={styles.summaryNumItem}>
                      <span className={styles.summaryLabel}>Cucina</span>
                      <span className={styles.summaryValue}>{u.cookAll}</span>
                    </div>
                    <div className={styles.summaryNumItem}>
                      <span className={styles.summaryLabel}>Piatti</span>
                      <span className={styles.summaryValue}>{u.cleanAll}</span>
                    </div>
                    <div className={styles.summaryNumItem}>
                      <span className={styles.summaryLabel}>Totale</span>
                      <span className={styles.summaryValueStrong}>{u.cookAll + u.cleanAll}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {slots.length === 0 ? (
        <div className={styles.empty}>Nessuna colonna attiva. Controlla le impostazioni dei pasti e dei task.</div>
      ) : (
        <>
          <div className={styles.desktopOnly}>
            <div className={styles.tableBlock}>{renderDesktopTable()}</div>
          </div>
          <div className={styles.mobileOnly}>{renderMobileCards()}</div>
        </>
      )}

      {loading && <div className={styles.loading}>Caricamento…</div>}
    </section>
  );
}
