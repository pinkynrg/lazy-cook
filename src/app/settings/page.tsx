'use client';

import { useState, useEffect } from 'react';
import SavedPlans from '@/components/SavedPlans';
import type { Settings } from '@/types/recipe';
import styles from './page.module.scss';

export default function SettingsPage() {
  const [nickname, setNickname] = useState('');
  const [initialNickname, setInitialNickname] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [familySize, setFamilySize] = useState(2);
  const [enableBreakfast, setEnableBreakfast] = useState(false);
  const [enableLunch, setEnableLunch] = useState(true);
  const [enableDinner, setEnableDinner] = useState(true);
  const [currentPlanName, setCurrentPlanName] = useState('Piano Settimanale');
  const [enableFamilyTasks, setEnableFamilyTasks] = useState(true);

  const [cookBreakfast, setCookBreakfast] = useState(false);
  const [cookLunch, setCookLunch] = useState(true);
  const [cookDinner, setCookDinner] = useState(true);
  const [cleanBreakfast, setCleanBreakfast] = useState(false);
  const [cleanLunch, setCleanLunch] = useState(true);
  const [cleanDinner, setCleanDinner] = useState(true);

  useEffect(() => {
    loadSettings();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) return;
      const data = await res.json();
      const nick = data?.user?.nickname;
      const nicknameValue = typeof nick === 'string' ? nick : '';
      setNickname(nicknameValue);
      setInitialNickname(nicknameValue);
    } catch {
      // ignore
    }
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const saveNickname = async (value: string) => {
    // Only save if value has changed
    if (value === initialNickname) return;
    
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: value }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const saved = data?.nickname;
        const savedValue = typeof saved === 'string' ? saved : '';
        setNickname(savedValue);
        setInitialNickname(savedValue);
        showSuccessToast('Nickname salvato');
      }
    } catch (error) {
      console.error('Error saving nickname:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data: Settings = await response.json();
        setFamilySize(data.familySize);
        setEnableBreakfast(data.enableBreakfast);
        setEnableLunch(data.enableLunch);
        setEnableDinner(data.enableDinner);
        setCurrentPlanName(data.currentPlanName || 'Piano Settimanale');
        setEnableFamilyTasks(data.enableFamilyTasks !== undefined ? data.enableFamilyTasks : true);

        setCookBreakfast(!!data.cookBreakfast);
        setCookLunch(data.cookLunch !== undefined ? !!data.cookLunch : true);
        setCookDinner(data.cookDinner !== undefined ? !!data.cookDinner : true);
        setCleanBreakfast(!!data.cleanBreakfast);
        setCleanLunch(data.cleanLunch !== undefined ? !!data.cleanLunch : true);
        setCleanDinner(data.cleanDinner !== undefined ? !!data.cleanDinner : true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    const newSettings = {
      familySize,
      enableBreakfast,
      enableLunch,
      enableDinner,
      currentPlanName,
      enableFamilyTasks,
      cookBreakfast,
      cookLunch,
      cookDinner,
      cleanBreakfast,
      cleanLunch,
      cleanDinner,
      ...updates,
    };

    if (updates.familySize !== undefined) setFamilySize(updates.familySize);
    if (updates.enableBreakfast !== undefined) setEnableBreakfast(updates.enableBreakfast);
    if (updates.enableLunch !== undefined) setEnableLunch(updates.enableLunch);
    if (updates.enableDinner !== undefined) setEnableDinner(updates.enableDinner);
    if (updates.currentPlanName !== undefined) setCurrentPlanName(updates.currentPlanName);
    if (updates.enableFamilyTasks !== undefined) setEnableFamilyTasks(updates.enableFamilyTasks);

    if (updates.cookBreakfast !== undefined) setCookBreakfast(!!updates.cookBreakfast);
    if (updates.cookLunch !== undefined) setCookLunch(!!updates.cookLunch);
    if (updates.cookDinner !== undefined) setCookDinner(!!updates.cookDinner);
    if (updates.cleanBreakfast !== undefined) setCleanBreakfast(!!updates.cleanBreakfast);
    if (updates.cleanLunch !== undefined) setCleanLunch(!!updates.cleanLunch);
    if (updates.cleanDinner !== undefined) setCleanDinner(!!updates.cleanDinner);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      showSuccessToast('Impostazioni salvate');
      
      // Notify other components that settings have been updated
      window.dispatchEvent(new Event('settingsUpdated'));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const loadRecipesFromDb = async () => {
    // Trigger reload on main page
    window.location.href = '/';
  };

  return (
    <div className="page-container">
      <section className="page-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <i className="bi bi-gear"></i> Impostazioni
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Configura famiglia, pasti abilitati e gestisci il tuo household condiviso.
          </p>
        </div>
        <div className="settings-grid">
          <div className="setting-card full-width">
            <div className="setting-header">
              <i className="bi bi-person-badge-fill"></i>
              <h3>Profilo</h3>
            </div>
            <div className="setting-body">
              <p className="setting-description">
                Imposta un nickname (facoltativo) che verrà mostrato al posto dell’email nelle liste e nei task.
              </p>

              <input
                className={styles.nicknameInput}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={(e) => saveNickname(e.target.value)}
                placeholder="Il tuo nickname"
                maxLength={32}
              />
              <div className={styles.nicknameHint}>Lascia vuoto per usare l’email.</div>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-header">
              <i className="bi bi-people-fill"></i>
              <h3>Numero Persone</h3>
            </div>
            <div className="setting-body">
              <p className="setting-description">
                Imposta il numero di persone per cui cucinerai. Le ricette verranno automaticamente scalate.
              </p>
              <div className="family-size-control">
                <button
                  className="btn btn-outline"
                  onClick={() => updateSettings({ familySize: Math.max(1, familySize - 1) })}
                >
                  <i className="bi bi-dash-lg"></i>
                </button>
                <span className="family-size-display">{familySize}</span>
                <button
                  className="btn btn-outline"
                  onClick={() => updateSettings({ familySize: familySize + 1 })}
                >
                  <i className="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-header">
              <i className="bi bi-calendar-check-fill"></i>
              <h3>Pasti da Pianificare</h3>
            </div>
            <div className="setting-body">
              <p className="setting-description">
                Scegli quali pasti mostrare nel piano settimanale
              </p>
              <div className="meal-toggles-vertical">
                <label className="meal-toggle-item">
                  <input
                    type="checkbox"
                    checked={enableBreakfast}
                    onChange={(e) => updateSettings({ enableBreakfast: e.target.checked })}
                  />
                  <span><i className="bi bi-sunrise-fill"></i> Colazione</span>
                </label>
                <label className="meal-toggle-item">
                  <input
                    type="checkbox"
                    checked={enableLunch}
                    onChange={(e) => updateSettings({ enableLunch: e.target.checked })}
                  />
                  <span><i className="bi bi-sun-fill"></i> Pranzo</span>
                </label>
                <label className="meal-toggle-item">
                  <input
                    type="checkbox"
                    checked={enableDinner}
                    onChange={(e) => updateSettings({ enableDinner: e.target.checked })}
                  />
                  <span><i className="bi bi-moon-fill"></i> Cena</span>
                </label>
              </div>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-header">
              <i className="bi bi-check2-square"></i>
              <h3>Task Familiari</h3>
            </div>
            <div className="setting-body">
              <p className="setting-description">
                Disabilita i task familiari se sei da solo e non hai bisogno di tracciare chi fa cosa.
              </p>
              <label className="meal-toggle-item" style={{ marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={enableFamilyTasks}
                  onChange={(e) => updateSettings({ enableFamilyTasks: e.target.checked })}
                />
                <span>Mostra Task Familiari</span>
              </label>

              {enableFamilyTasks && (
                <>
                  <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                    Seleziona quando di solito si cucina e quando di solito si lavano i piatti.
                    Queste opzioni controllano quali colonne compaiono nella tabella dei task.
                  </div>

                  <div className="meal-toggles-vertical" style={{ gap: 12 }}>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>Quando si cucina</div>
                    <label className="meal-toggle-item">
                      <input type="checkbox" checked={cookBreakfast} onChange={(e) => updateSettings({ cookBreakfast: e.target.checked })} />
                      <span><i className="bi bi-sunrise-fill"></i> Colazione</span>
                    </label>
                    <label className="meal-toggle-item">
                      <input type="checkbox" checked={cookLunch} onChange={(e) => updateSettings({ cookLunch: e.target.checked })} />
                      <span><i className="bi bi-sun-fill"></i> Pranzo</span>
                    </label>
                    <label className="meal-toggle-item">
                      <input type="checkbox" checked={cookDinner} onChange={(e) => updateSettings({ cookDinner: e.target.checked })} />
                      <span><i className="bi bi-moon-fill"></i> Cena</span>
                    </label>

                    <div style={{ fontWeight: 700, marginTop: 10 }}>Quando si lavano i piatti</div>
                    <label className="meal-toggle-item">
                      <input type="checkbox" checked={cleanBreakfast} onChange={(e) => updateSettings({ cleanBreakfast: e.target.checked })} />
                      <span><i className="bi bi-sunrise-fill"></i> Colazione</span>
                    </label>
                    <label className="meal-toggle-item">
                      <input type="checkbox" checked={cleanLunch} onChange={(e) => updateSettings({ cleanLunch: e.target.checked })} />
                      <span><i className="bi bi-sun-fill"></i> Pranzo</span>
                    </label>
                    <label className="meal-toggle-item">
                      <input type="checkbox" checked={cleanDinner} onChange={(e) => updateSettings({ cleanDinner: e.target.checked })} />
                      <span><i className="bi bi-moon-fill"></i> Cena</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="setting-card full-width">
            <div className="setting-header">
              <i className="bi bi-clock-history"></i>
              <h3>Piani Salvati</h3>
            </div>
            <div className="setting-body">
              <SavedPlans 
                onRestore={loadRecipesFromDb} 
                currentPlanName={currentPlanName}
                onPlanNameChange={(name) => updateSettings({ currentPlanName: name })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {showToast && (
        <div className="toast-notification">
          <i className="bi bi-check-circle-fill"></i>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
