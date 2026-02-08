'use client';

import { useState } from 'react';
import type { GroceryItem } from '@/types/recipe';

interface GroceryListProps {
  groceryList: GroceryItem[];
  onNormalize: () => Promise<void>;
  isNormalized: boolean;
  hasRecipes: boolean;
  onToggleChecked: (itemId: number | undefined, checked: boolean) => void;
  onClearList: () => void;
}

export default function GroceryList({ groceryList, onNormalize, isNormalized, hasRecipes, onToggleChecked, onClearList }: GroceryListProps) {
  const [normalizing, setNormalizing] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<GroceryItem | null>(null);

  const handleNormalize = async () => {
    setNormalizing(true);
    try {
      await onNormalize();
    } finally {
      setNormalizing(false);
    }
  };

  const copyGroceryList = () => {
    const text = groceryList
      .map(item => {
        const quantityText = item.totalQuantity || item.quantities.filter(q => q).join(' + ') || 'q.b.';
        return `${item.name} - ${quantityText}`;
      })
      .join('\n');

    navigator.clipboard.writeText(text).then(
      () => alert('Lista copiata negli appunti!'),
      err => alert('Errore nel copiare: ' + err)
    );
  };

  const exportGroceryList = () => {
    const text = groceryList
      .map(item => {
        const quantityText = item.totalQuantity || item.quantities.filter(q => q).join(' + ') || 'q.b.';
        return `${item.name} - ${quantityText}`;
      })
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-spesa-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grocery-section">
      <div className="section-header">
        <h2><i className="bi bi-cart"></i> Lista della Spesa</h2>
        <div className="section-header-actions">
          {!isNormalized && (
            <button
              onClick={handleNormalize}
              className="btn btn-secondary"
              disabled={normalizing || !hasRecipes}
            >
              {normalizing ? <><i className="bi bi-hourglass-split"></i> Calcolo in corso...</> : <><i className="bi bi-cart"></i> Calcola lista spesa</>}
            </button>
          )}
          {isNormalized && groceryList.length > 0 && (
            <>
              <span className="grocery-count">
                {groceryList.filter(item => !item.checked).length}/{groceryList.length} articoli
              </span>
              <button
                onClick={copyGroceryList}
                className="btn btn-text btn-small"
                title="Copia negli appunti"
              >
                <i className="bi bi-clipboard"></i> Copia
              </button>
            </>
          )}
        </div>
      </div>

      {!hasRecipes ? (
        <div className="grocery-list">
          <p className="empty-state">Aggiungi ricette per generare la lista della spesa</p>
        </div>
      ) : !isNormalized ? (
        <div className="grocery-list">
          <p className="empty-state">
            👆 Clicca su "Calcola lista spesa" per generare la lista intelligente
          </p>
        </div>
      ) : (
        <>
          <div className="grocery-list">
            {groceryList.map((item, index) => {
              // Prefer totals computed from per-recipe sources (handles mixed units); fallback to AI/quantities
              const quantityText = item.totalQuantity || item.quantities.filter(q => q).join(' + ') || 'q.b.';
              const hasSources = Array.isArray(item.sources) && item.sources.length > 0;
              return (
                <div 
                  key={item.id || `${item.name}-${index}`}
                  className={`grocery-item ${item.checked ? 'checked' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={item.checked || false}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleChecked(item.id, e.target.checked);
                    }}
                    disabled={!item.id}
                    className="grocery-checkbox"
                  />
                  <div 
                    className="grocery-item-content"
                    onClick={() => {
                      if (item.sources && item.sources.length > 0) {
                        setInspectingItem(item);
                      }
                    }}
                  >
                    <div>
                      <div className="ingredient-name">
                        {item.name}
                      </div>
                      {item.sources && item.sources.length > 1 && (
                        <div className="ingredient-notes">{item.sources.length} ricette</div>
                      )}
                    </div>
                    <div className="ingredient-quantity">{quantityText}</div>
                  </div>
                  <button
                    className="btn-inspect"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Inspecting item:', item);
                      setInspectingItem(item);
                    }}
                    title="Vedi dettagli"
                    style={{ 
                      display: hasSources ? 'block' : 'none'
                    }}
                  >
                    <i className="bi bi-info-circle"></i>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grocery-footer">
            <button 
              onClick={onClearList} 
              className="btn btn-text btn-danger"
              title="Svuota lista spesa"
            >
              <i className="bi bi-trash"></i> Svuota lista
            </button>
          </div>
        </>
      )}

      {/* Inspection Modal */}
      {inspectingItem && (
        <div className="modal-overlay" onClick={() => setInspectingItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{inspectingItem.name}</h3>
              <button 
                className="modal-close"
                onClick={() => setInspectingItem(null)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="ingredient-total">
                <strong>Totale:</strong> {inspectingItem.totalQuantity || inspectingItem.quantities.join(' + ') || 'q.b.'}
              </div>
              <div className="ingredient-sources">
                <h4>Usato in:</h4>
                {inspectingItem.sources?.map((source, idx) => (
                  <div key={idx} className="source-item">
                    <div className="source-recipe">{source.recipeName}</div>
                    <div className="source-quantity">
                      {(() => {
                        const raw = (source.quantity ?? '').toString().trim();
                        if (!raw) return 'q.b.';
                        // If it's just a number, append ingredient name (e.g. "5" -> "5 uova")
                        if (/^\d+(?:[.,]\d+)?$/.test(raw)) {
                          return `${raw} ${inspectingItem.name.toLowerCase()}`;
                        }
                        return raw;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
