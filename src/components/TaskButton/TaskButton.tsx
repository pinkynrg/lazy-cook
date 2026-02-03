import styles from './TaskButton.module.scss';

interface TaskButtonProps {
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function TaskButton({ icon, label, color, onClick, disabled }: TaskButtonProps) {
  return (
    <button
      className={styles.taskButton}
      style={{ borderColor: color }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.icon} style={{ color }}>{icon}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
