'use client';

import { useState, useEffect } from 'react';

interface SavedPlan {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SavedPlansProps {
  onRestore: () => void;
  currentPlanName: string;
  onPlanNameChange: (name: string) => void;
}

export default function SavedPlans({ onRestore, currentPlanName, onPlanNameChange }: SavedPlansProps) {
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    try {
      const response = await fetch('/api/saved-plans');
      if (response.ok) {
        const { plans } = await response.json();
        setSavedPlans(plans);
      }
    } catch (error) {
      console.error('Error loading saved plans:', error);
    }
  };

  const handleSavePlan = async () => {
    const planNameToSave = currentPlanName.trim() || 'Piano';
    const now = new Date();
    const formattedDate = now.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const fullPlanName = `${planNameToSave} - ${formattedDate}`;

    setSaving(true);
    try {
      const response = await fetch('/api/saved-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullPlanName }),
      });

      if (response.ok) {
        await loadSavedPlans();
        alert('Piano salvato con successo!');
      } else {
        const { error } = await response.json();
        alert(error || 'Errore nel salvataggio del piano');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Errore nel salvataggio del piano');
    } finally {
      setSaving(false);
    }
  };

  const handleRestorePlan = async (planId: number) => {
    if (!confirm('Vuoi ripristinare questo piano? La pianificazione corrente verrà sostituita.')) {
      return;
    }

    try {
      const response = await fetch('/api/saved-plans/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        const data = await response.json();
        onRestore();
        alert(data.message || 'Piano ripristinato con successo!');
      } else {
        const { error } = await response.json();
        alert(error || 'Errore nel ripristino del piano');
      }
    } catch (error) {
      console.error('Error restoring plan:', error);
      alert('Errore nel ripristino del piano');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('Vuoi eliminare questo piano salvato?')) {
      return;
    }

    try {
      const response = await fetch('/api/saved-plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        await loadSavedPlans();
        alert('Piano eliminato con successo!');
      } else {
        alert('Errore nell\'eliminazione del piano');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Errore nell\'eliminazione del piano');
    }
  };

  return (
    <div className="saved-plans-section">
      <div className="saved-plans-header">
        <div className="saved-plans-title-wrapper">
          <h2>💾 Piani Salvati ({savedPlans.length})</h2>
          <button 
            className="pool-toggle-btn" 
            type="button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
        <div className="plan-name-input-wrapper">
          <input
            type="text"
            value={currentPlanName}
            onChange={(e) => onPlanNameChange(e.target.value)}
            placeholder="Nome del piano corrente"
            className="plan-name-input"
          />
          <button
            className="btn btn-primary btn-small"
            onClick={handleSavePlan}
            disabled={saving}
            title="Salva piano corrente"
          >
            {saving ? '⏳' : '💾'} Salva Piano
          </button>
        </div>
      </div>

      {expanded && (
        <div className="saved-plans-content">
          {savedPlans.length === 0 ? (
            <p className="empty-pool">Nessun piano salvato</p>
          ) : (
            <div className="saved-plans-list">
              {savedPlans.map(plan => (
                <div key={plan.id} className="saved-plan-card">
                  <div className="saved-plan-info">
                    <h3>{plan.name}</h3>
                  </div>
                  <div className="saved-plan-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleRestorePlan(plan.id)}
                      title="Ripristina questo piano"
                    >
                      ↻ Ripristina
                    </button>
                    <button
                      className="btn btn-text btn-danger"
                      onClick={() => handleDeletePlan(plan.id)}
                      title="Elimina piano"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
