'use client';

import FamilyTasksTable from '@/components/FamilyTasksTable/FamilyTasksTable';
import styles from './tasks.module.scss';

export default function TasksPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>✅ Task Familiari</h1>
        <p>Traccia chi fa cosa</p>
      </div>

      <div className={`page-content ${styles.pageContentPad}`}>
        <FamilyTasksTable />
      </div>
    </div>
  );
}

