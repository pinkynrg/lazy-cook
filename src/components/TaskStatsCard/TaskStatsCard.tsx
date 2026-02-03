import styles from './TaskStatsCard.module.scss';

interface TaskStatsCardProps {
  username: string;
  tasks: { [taskType: string]: number };
  taskLabels: { [key: string]: { icon: string } };
}

export default function TaskStatsCard({ username, tasks, taskLabels }: TaskStatsCardProps) {
  return (
    <div className={styles.statCard}>
      <h3>{username}</h3>
      <div className={styles.statItems}>
        {Object.entries(taskLabels).map(([type, { icon }]) => (
          <div key={type} className={styles.statItem}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.count}>{tasks[type] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
