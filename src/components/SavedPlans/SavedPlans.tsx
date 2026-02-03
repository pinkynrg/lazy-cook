'use client';

import { useState, useEffect } from 'react';
import styles from './SavedPlans.module.scss';

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
    <div className="saved-plans-compact">
      <div className="plan-save-section">
        <input
          type="text"
          value={currentPlanName}
          onChange={(e) => onPlanNameChange(e.target.value)}
          placeholder="Nome del piano corrente"
          className="plan-name-input-compact"
        />
        <button
          className="btn btn-primary btn-compact"
          onClick={handleSavePlan}
          disabled={saving}
          title="Salva piano corrente"
        >
          {saving ? <i className="bi bi-hourglass-split"></i> : <i className="bi bi-save-fill"></i>} Salva
        </button>
      </div>

      {savedPlans.length > 0 && (
        <div className="saved-plans-list-compact">
          {savedPlans.map(plan => (
            <div key={plan.id} className="saved-plan-item-compact">
              <div className="saved-plan-info">
                <span className="saved-plan-name">{plan.name}</span>
                <span className="saved-plan-date">
                  {new Date(plan.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="saved-plan-actions">
                <button
                  className="btn-icon btn-restore"
                  onClick={() => handleRestorePlan(plan.id)}
                  title="Ripristina piano"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
                <button
                  className="btn-icon btn-delete"
                  onClick={() => handleDeletePlan(plan.id)}
                  title="Elimina piano"
                >
                  <i className="bi bi-trash-fill"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
