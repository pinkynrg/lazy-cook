import styles from './TaskHistoryItem.module.scss';

interface TaskHistoryItemProps {
  icon: string;
  label: string;
  username: string;
  time: string;
  date: string;
  onDelete?: () => void;
}

export default function TaskHistoryItem({ icon, label, username, time, date, onDelete }: TaskHistoryItemProps) {
  return (
    <div className={styles.taskItem}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.user}>{username}</span>
        <span className={styles.date}>{date}</span>
      </div>
      <span className={styles.time}>{time}</span>
      {onDelete && (
        <button 
          onClick={onDelete}
          className={styles.deleteBtn}
          title="Elimina task"
        >
          ✕
        </button>
      )}
    </div>
  );
}
