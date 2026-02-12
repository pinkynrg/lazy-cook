'use client';

import { useState } from 'react';
import FamilyTasksTable from '@/components/FamilyTasksTable/FamilyTasksTable';
import styles from './tasks.module.scss';

type RangePreset = 'week' | '2weeks' | 'month';

export default function TasksPage() {
  const [preset, setPreset] = useState<RangePreset>('week');

  return (
    <div className="page-container">
      <section className="page-content tasks-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <i className="bi bi-calendar-week"></i> Task Familiari
            </h2>
          </div>
          <select 
            value={preset} 
            onChange={(e) => setPreset(e.target.value as RangePreset)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
          >
            <option value="week">Ultimi 7 giorni</option>
            <option value="2weeks">Ultimi 14 giorni</option>
            <option value="month">Ultimi 28 giorni</option>
          </select>
        </div>

        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Compila e consulta chi ha fatto cosa, giorno per giorno.
        </p>

        <FamilyTasksTable preset={preset} onPresetChange={setPreset} />
      </section>
    </div>
  );
}