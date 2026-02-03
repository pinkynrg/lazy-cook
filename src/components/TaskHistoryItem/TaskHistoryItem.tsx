import styles from './TaskHistoryItem.module.scss';

interface TaskHistoryItemProps {
  icon: string;
  label: string;
  username: string;
  time: string;
}

export default function TaskHistoryItem({ icon, label, username, time }: TaskHistoryItemProps) {
  return (
    <div className={styles.taskItem}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.user}>{username}</span>
      </div>
      <span className={styles.time}>{time}</span>
    </div>
  );
}
