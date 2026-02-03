'use client';

import { useState, useEffect } from 'react';
import SavedPlans from '@/components/SavedPlans';
import type { Settings } from '@/types/recipe';

export default function SettingsPage() {
  const [familySize, setFamilySize] = useState(2);
  const [enableBreakfast, setEnableBreakfast] = useState(false);
  const [enableLunch, setEnableLunch] = useState(true);
  const [enableDinner, setEnableDinner] = useState(true);
  const [currentPlanName, setCurrentPlanName] = useState('Piano Settimanale');

  useEffect(() => {
    loadSettings();
  }, []);

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
      ...updates,
    };

    if (updates.familySize !== undefined) setFamilySize(updates.familySize);
    if (updates.enableBreakfast !== undefined) setEnableBreakfast(updates.enableBreakfast);
    if (updates.enableLunch !== undefined) setEnableLunch(updates.enableLunch);
    if (updates.enableDinner !== undefined) setEnableDinner(updates.enableDinner);
    if (updates.currentPlanName !== undefined) setCurrentPlanName(updates.currentPlanName);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
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
      <div className="page-header">
        <h1>⚙️ Impostazioni</h1>
        <p>Configura le preferenze per il tuo piano pasti</p>
      </div>

      <div className="page-content">
        <div className="settings-grid">
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
      </div>
    </div>
  );
}
