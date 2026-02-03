'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './HouseholdManager.module.scss';

interface Household {
  id: number;
  name: string;
  inviteCode: string;
  role: string;
  isActive: number;
}

interface HouseholdManagerProps {
  onClose: () => void;
}

export default function HouseholdManager({ onClose }: HouseholdManagerProps) {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    try {
      const response = await fetch('/api/households');
      if (response.ok) {
        const data = await response.json();
        setHouseholds(data.households);
      }
    } catch (error) {
      console.error('Error loading households:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (householdId: number) => {
    setActionLoading(true);
    setError('');
    try {
      const response = await fetch('/api/households/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      });

      if (response.ok) {
        // Force a full page reload to refresh all data
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.error || 'Errore nel cambio famiglia');
      }
    } catch (error) {
      setError('Errore nel cambio famiglia');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      const response = await fetch('/api/households/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();

      if (response.ok) {
        // Force a full page reload to refresh all data
        window.location.reload();
      } else {
        setError(data.error || 'Codice non valido');
      }
    } catch (error) {
      setError('Errore nell\'unione alla famiglia');
    } finally {
      setActionLoading(false);
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Codice copiato!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Codice copiato!');
    }
  };

  if (loading) {
    return (
      <div className="household-manager">
        <div className="household-overlay" onClick={onClose} />
        <div className="household-panel">
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="household-manager">
      <div className="household-overlay" onClick={onClose} />
      <div className="household-panel">
        <div className="household-header">
          <h3><i className="bi bi-people-fill"></i> Le Mie Famiglie</h3>
          <button className="household-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="household-content">
          {error && (
            <div className="household-error">
              <i className="bi bi-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {!showJoin && (
            <>
              <div className="households-list">
                {households.map((household) => (
                  <div
                    key={household.id}
                    className={`household-item ${household.isActive ? 'active' : ''}`}
                  >
                    <div className="household-info">
                      <h4>{household.name}</h4>
                      <span className="household-role">
                        {household.role === 'owner' ? 'Proprietario' : 'Membro'}
                      </span>
                    </div>
                    <div className="household-actions">
                      {household.isActive ? (
                        <>
                          <span className="active-badge">Attiva</span>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => copyInviteCode(household.inviteCode)}
                          >
                            <i className="bi bi-clipboard"></i> Codice
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSwitch(household.id)}
                          disabled={actionLoading}
                        >
                          Attiva
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="household-buttons">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowJoin(true)}
                >
                  <i className="bi bi-box-arrow-in-right"></i> Unisciti con Codice
                </button>
              </div>
            </>
          )}

          {showJoin && (
            <form onSubmit={handleJoin} className="household-form">
              <h4>Unisciti a una Famiglia</h4>
              <div className="form-group">
                <label htmlFor="invite-code">Codice Invito</label>
                <input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ES: ABC123XY"
                  required
                  maxLength={8}
                  disabled={actionLoading}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowJoin(false);
                    setInviteCode('');
                    setError('');
                  }}
                  disabled={actionLoading}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Accesso...' : 'Unisciti'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
