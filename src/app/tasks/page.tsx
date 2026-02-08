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

interface MissingTask {
  date: string;
  dateStr: string; // YYYY-MM-DD format
  taskType: string;
}

interface HouseholdMember {
  id: number;
  username: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [missingTasks, setMissingTasks] = useState<MissingTask[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [skippedTasks, setSkippedTasks] = useState<Set<string>>(new Set());
  const [currentMissingIndex, setCurrentMissingIndex] = useState(0);

  useEffect(() => {
    loadTasks();
    loadHouseholdMembers();
  }, [days]);

  // Recalculate missing tasks when tasks or skippedTasks change
  useEffect(() => {
    console.log('useEffect triggered - tasks:', tasks.length, 'skippedTasks:', skippedTasks.size);
    if (tasks.length > 0) {
      detectMissingTasks(tasks);
    }
  }, [tasks, skippedTasks]);

  // Reset index when missing tasks change
  useEffect(() => {
    console.log('Resetting index to 0, missingTasks:', missingTasks.length, 'current array:', missingTasks);
    setCurrentMissingIndex(0);
  }, [missingTasks]);

  const loadTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setStats(data.stats || []);
        detectMissingTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadHouseholdMembers = async () => {
    try {
      const response = await fetch('/api/households');
      if (response.ok) {
        const data = await response.json();
        const members = data.members || [];
        setHouseholdMembers(members);
      }
    } catch (error) {
      console.error('Error loading household members:', error);
    }
  };

  const detectMissingTasks = (tasksList: Task[]) => {
    const today = new Date();
    const missing: MissingTask[] = [];
    
    console.log('detectMissingTasks called with', tasksList.length, 'tasks');
    console.log('All task dates:', tasksList.map(t => ({ date: t.completedAt, type: t.taskType })));
    
    // Check today and last 7 days for missing cooking or dishes
    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      console.log('Checking date:', dateStr);
      
      const dayTasks = tasksList.filter(task => {
        // Extract just the date part from completedAt (handles both "2026-02-07" and "2026-02-07 00:00:00")
        const taskDate = task.completedAt.split(' ')[0];
        console.log('  Comparing task date:', taskDate, 'with', dateStr, '- match:', taskDate === dateStr);
        return taskDate === dateStr;
      });
      
      const hasCooking = dayTasks.some(t => t.taskType === 'cooking');
      const hasDishes = dayTasks.some(t => t.taskType === 'dishes');
      
      const dateDisplay = checkDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
      
      if (!hasCooking && !skippedTasks.has(`${dateStr}-cooking`)) {
        missing.push({ date: dateDisplay, dateStr, taskType: 'cooking' });
      }
      if (!hasDishes && !skippedTasks.has(`${dateStr}-dishes`)) {
        missing.push({ date: dateDisplay, dateStr, taskType: 'dishes' });
      }
    }
    
    console.log('Setting missing tasks to:', missing.length, missing);
    
    // Update missing tasks - index will be managed by separate useEffect
    setMissingTasks(missing);
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
      } else {
        const data = await response.json();
        alert(data.error || 'Errore durante la registrazione del task');
      }
    } catch (error) {
      console.error('Error logging task:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo task?')) {
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        await loadTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const completeMissingTask = async (dateStr: string, taskType: string, userId: number) => {
    console.log('completeMissingTask called:', { dateStr, taskType, userId, currentIndex: currentMissingIndex });
    setLoading(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType, completedAt: dateStr, userId }),
      });

      if (response.ok) {
        console.log('Task completed successfully, reloading tasks...');
        await loadTasks();
      } else {
        const data = await response.json();
        alert(data.error || 'Errore durante la registrazione del task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setLoading(false);
    }
  };

  const skipMissingTask = (dateStr: string, taskType: string) => {
    const key = `${dateStr}-${taskType}`;
    setSkippedTasks(prev => new Set(prev).add(key));
    
    // Remove the task from the list
    const newMissingTasks = missingTasks.filter(t => !(t.dateStr === dateStr && t.taskType === taskType));
    setMissingTasks(newMissingTasks);
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

      <div className="page-content" style={{ padding: '24px' }}>
        {/* Missing Tasks - Step-by-Step */}
        {missingTasks.length > 0 && householdMembers.length > 0 && (
          <section className={styles.missingTasks}>
            <h2>⚠️ Task Mancanti</h2>
            <p className={styles.missingTasksDesc}>Chi ha fatto questi task? Clicca per registrare.</p>
            
            <div className={styles.missingTasksMobile}>
              {missingTasks.length > 0 && currentMissingIndex < missingTasks.length && (
                <>
                  <div className={styles.mobileProgress}>
                    Task {currentMissingIndex + 1} di {missingTasks.length}
                  </div>
                  
                  {(() => {
                    const task = missingTasks[currentMissingIndex];
                    const taskInfo = taskLabels[task.taskType];
                    return (
                      <div className={styles.mobileTaskCard}>
                        <div className={styles.mobileTaskHeader}>
                          <span className={styles.mobileTaskIcon}>{taskInfo.icon}</span>
                          <div>
                            <div className={styles.mobileTaskName}>{taskInfo.label}</div>
                            <div className={styles.mobileTaskDate}>{task.date}</div>
                          </div>
                        </div>

                        <div className={styles.mobileQuestion}>Chi l'ha fatto?</div>

                        <div className={styles.mobileUserButtons}>
                          {householdMembers.map(member => (
                            <button
                              disabled={loading}
                              key={member.id}
                              className={styles.mobileUserBtn}
                              onClick={() => completeMissingTask(task.dateStr, task.taskType, member.id)}
                            >
                              {member.username}
                            </button>
                          ))}
                        </div>

                        <div className={styles.mobileActions}>
                          <button
                            className={styles.mobileSkipBtn}
                            onClick={() => skipMissingTask(task.dateStr, task.taskType)}
                          >
                            Salta (non applicabile)
                          </button>
                          {currentMissingIndex > 0 && (
                            <button
                              className={styles.mobilePrevBtn}
                              onClick={() => setCurrentMissingIndex(prev => prev - 1)}
                            >
                              ← Precedente
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </section>
        )}

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
                const taskDate = new Date(task.completedAt);
                const dateStr = taskDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <TaskHistoryItem
                    key={task.id}
                    icon={taskInfo.icon}
                    label={taskInfo.label}
                    username={task.username}
                    time={formatDate(task.completedAt)}
                    date={dateStr}
                    onDelete={() => deleteTask(task.id)}
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

