'use client';

import { useState, useEffect } from 'react';
import TaskButton from '@/components/TaskButton/TaskButton';
import TaskStatsCard from '@/components/TaskStatsCard/TaskStatsCard';
import TaskHistoryItem from '@/components/TaskHistoryItem/TaskHistoryItem';
import styles from './tasks.module.scss';

interface Task {
  id: number;
  taskType: string;
  completedAt: string;
  username: string;
}

interface TaskStat {
  username: string;
  taskType: string;
  count: number;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadTasks();
  }, [days]);

  const loadTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const logTask = async (taskType: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType }),
      });

      if (response.ok) {
        await loadTasks();
      }
    } catch (error) {
      console.error('Error logging task:', error);
    } finally {
      setLoading(false);
    }
  };

  const taskLabels: { [key: string]: { label: string; icon: string; color: string } } = {
    shopping: { label: 'Fatto la Spesa', icon: '🛒', color: '#10b981' },
    cooking: { label: 'Fatto Cucina', icon: '👨‍🍳', color: '#f59e0b' },
    dishes: { label: 'Lavato i Piatti', icon: '🧽', color: '#3b82f6' },
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  // Calculate stats by user
  const userStats: { [username: string]: { [taskType: string]: number } } = {};
  stats.forEach(stat => {
    if (!userStats[stat.username]) {
      userStats[stat.username] = {};
    }
    userStats[stat.username][stat.taskType] = stat.count;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>✅ Task Familiari</h1>
        <p>Traccia chi fa cosa in casa</p>
      </div>

      <div className="page-content">
        {/* Quick Action Buttons */}
        <section className={styles.taskActions}>
          <h2>Registra un Task</h2>
          <div className={styles.taskButtons}>
            {Object.entries(taskLabels).map(([type, { label, icon, color }]) => (
              <TaskButton
                key={type}
                icon={icon}
                label={label}
                color={color}
                onClick={() => logTask(type)}
                disabled={loading}
              />
            ))}
          </div>
        </section>

        {/* Stats by User */}
        {Object.keys(userStats).length > 0 && (
          <section className={styles.taskStats}>
            <div className={styles.statsHeader}>
              <h2>Statistiche</h2>
              <div className={styles.taskFilter}>
                <label>Mostra ultimi:</label>
                <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
                  <option value="7">7 giorni</option>
                  <option value="14">14 giorni</option>
                  <option value="30">30 giorni</option>
                </select>
              </div>
            </div>
            <div className={styles.statsTable}>
              {Object.entries(taskLabels).map(([type, { icon, label, color }]) => {
                const allCounts = Object.entries(userStats).map(([username, userTasks]) => ({
                  username,
                  count: userTasks[type] || 0
                }));
                const maxCount = Math.max(...allCounts.map(u => u.count), 1);
                const minCount = Math.min(...allCounts.map(u => u.count));
                const totalCount = allCounts.reduce((sum, u) => sum + u.count, 0);
                
                return (
                  <div key={type} className={styles.taskSection}>
                    <div className={styles.taskHeader}>
                      <span className={styles.taskIcon} style={{ color }}>{icon}</span>
                      <span className={styles.taskLabel}>{label}</span>
                    </div>
                    <div className={styles.userBars}>
                      {allCounts.map(({ username, count }) => {
                        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        const isLowest = count === minCount && allCounts.length > 1 && totalCount > 0;
                        
                        return (
                          <div key={username} className={`${styles.userBar} ${isLowest ? styles.needsToDoIt : ''}`}>
                            <div className={styles.userInfo}>
                              <span className={styles.userName}>{username}</span>
                              <span className={styles.userStats}>
                                <span className={styles.countBadge}>{count}</span>
                                {totalCount > 0 && (
                                  <span className={styles.percentage}>{percentage}%</span>
                                )}
                              </span>
                            </div>
                            <div className={styles.barContainer}>
                              <div 
                                className={styles.bar} 
                                style={{ 
                                  width: `${barWidth}%`,
                                  background: color
                                }}
                              />
                            </div>
                            {isLowest && <div className={styles.nextUpBadge}>IL TUO TURNO! 🎯</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Task History */}
        <section className={styles.taskHistory}>
          <h2>Cronologia</h2>
          <div className={styles.taskList}>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>Nessun task registrato</p>
              </div>
            ) : (
              tasks.map((task) => {
                const taskInfo = taskLabels[task.taskType];
                return (
                  <TaskHistoryItem
                    key={task.id}
                    icon={taskInfo.icon}
                    label={taskInfo.label}
                    username={task.username}
                    time={formatDate(task.completedAt)}
                  />
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

