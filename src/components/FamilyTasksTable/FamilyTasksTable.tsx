'use client';

import { useEffect, useMemo, useState } from 'react';
import Select, {
  components,
  type MultiValue,
  type ValueContainerProps,
  type MultiValueProps,
} from 'react-select';
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
  nickname?: string | null;
  displayName?: string;
};

type MemberOption = {
  value: number;
  label: string;
};

function CompactValueContainer(props: ValueContainerProps<MemberOption, true>) {
  const values = props.getValue();
  const title = values.map(v => v.label).join(', ');
  const summary = title;

  return (
    <components.ValueContainer {...props}>
      {values.length > 0 && (
        <div className={styles.valueSummary} title={title}>
          {summary}
        </div>
      )}
      {props.children}
    </components.ValueContainer>
  );
}

function HiddenMultiValue(_props: MultiValueProps<MemberOption>) {
  return null;
}

type TaskRow = {
  id: number;
  taskType: string;
  completedAt: string;
  dateStr: string;
  userId: number;
  username: string;
  displayName?: string;
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

  const memberOptions = useMemo<MemberOption[]>(() => {
    return members.map(m => ({ value: m.id, label: m.displayName || m.nickname || m.username }));
  }, [members]);

  const memberOptionById = useMemo(() => {
    return new Map(memberOptions.map(o => [o.value, o] as const));
  }, [memberOptions]);

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
    const map = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      const key = `${t.dateStr}-${t.taskType}`;
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    // Keep deterministic order within each cell
    for (const [key, arr] of map) {
      arr.sort((a, b) => (a.displayName || a.username).localeCompare((b.displayName || b.username), 'it'));
      map.set(key, arr);
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
      const name = m.displayName || m.nickname || m.username;
      if (!map.has(m.id)) map.set(m.id, { userId: m.id, username: name, cookAll: 0, cleanAll: 0 });
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

  const setCellParticipants = async (dateStr: string, taskType: string, userIds: number[]) => {
    const cellKey = `${dateStr}-${taskType}`;
    setSavingCell(cellKey);
    setError(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateStr, taskType, userIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Errore nel salvataggio');
      }
      await loadTasks();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setSavingCell(null);
    }
  };

  const renderCellSelect = (dateStr: string, taskType: string, rows: TaskRow[]) => {
    const cellKey = `${dateStr}-${taskType}`;
    const isSaving = savingCell === cellKey;

    const uniqueIds = Array.from(new Set(rows.map(r => r.userId)));
    const value = uniqueIds
      .map(id => memberOptionById.get(id) || {
        value: id,
        label: rows.find(r => r.userId === id)?.displayName || rows.find(r => r.userId === id)?.username || String(id)
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'it'));

    return (
      <Select<MemberOption, true>
        className={styles.multiSelect}
        classNamePrefix="taskSelect"
        isMulti
        isClearable
        isDisabled={loading || isSaving}
        options={memberOptions}
        value={value}
        placeholder="—"
        noOptionsMessage={() => 'Nessun membro'}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
        components={{ ValueContainer: CompactValueContainer, MultiValue: HiddenMultiValue }}
        onChange={(newValue: MultiValue<MemberOption>) => {
          const ids = (newValue || []).map(v => v.value);
          void setCellParticipants(dateStr, taskType, ids);
        }}
      />
    );
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
                  <th key={slot.key} className={styles.slotCol}>
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
                  const rows = tasksByCell.get(cellKey) ?? [];
                  return (
                    <td
                      key={slot.key}
                      className={`${styles.slotCol} ${rows.length > 0 ? styles.filledCell : styles.emptyCell}`}
                    >
                      {renderCellSelect(dateStr, slot.key, rows)}
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
                const rows = tasksByCell.get(cellKey) ?? [];
                return (
                  <div key={slot.key} className={styles.mobileRow}>
                    <div className={styles.mobileLabel}>{slot.label}</div>
                    {renderCellSelect(dateStr, slot.key, rows)}
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
