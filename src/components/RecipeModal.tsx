'use client';

import { useState } from 'react';
import type { Recipe } from '@/types/recipe';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
  onUpdateServings?: (recipeId: number, servings: string) => void;
}

export default function RecipeModal({ recipe, onClose, onUpdateServings }: RecipeModalProps) {
  const [isEditingServings, setIsEditingServings] = useState(false);
  const [servingsInput, setServingsInput] = useState(recipe.servings || '');

  const handleSaveServings = () => {
    if (onUpdateServings && recipe.id) {
      onUpdateServings(recipe.id, servingsInput);
    }
    setIsEditingServings(false);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{recipe.name}</h3>
          <button className="close" onClick={onClose}>
            &times;
          </button>
        </div>

        {recipe.image && (
          <img
            src={recipe.image}
            alt={recipe.name}
            style={{ width: '100%', borderRadius: '8px', marginBottom: '20px' }}
          />
        )}

        <div style={{ marginBottom: '20px' }}>
          {recipe.prepTime && <p>⏱️ Tempo: {recipe.prepTime}</p>}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditingServings ? (
              <>
                <span>👥 Porzioni:</span>
                <input
                  type="text"
                  value={servingsInput}
                  onChange={(e) => setServingsInput(e.target.value)}
                  placeholder="es. 4"
                  style={{
                    padding: '4px 8px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    width: '80px'
                  }}
                  autoFocus
                />
                <button 
                  onClick={handleSaveServings}
                  className="btn btn-small btn-secondary"
                  style={{ padding: '4px 12px' }}
                >
                  ✓
                </button>
                <button 
                  onClick={() => {
                    setIsEditingServings(false);
                    setServingsInput(recipe.servings || '');
                  }}
                  className="btn btn-small btn-outline"
                  style={{ padding: '4px 12px' }}
                >
                  ✕
                </button>
              </>
            ) : (
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                👥 Porzioni: {recipe.servings || 
                  <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Non disponibile
                  </span>
                }
                {onUpdateServings && (
                  <button
                    onClick={() => setIsEditingServings(true)}
                    className="btn-text"
                    style={{ 
                      padding: '2px 8px',
                      fontSize: '0.85rem',
                      color: 'var(--primary-color)'
                    }}
                    title={recipe.servings ? 'Modifica porzioni' : 'Aggiungi porzioni'}
                  >
                    {recipe.servings ? <i className="bi bi-pencil"></i> : '+ Aggiungi'}
                  </button>
                )}
              </p>
            )}
          </div>

          {recipe.url && (
            <p>
              🔗{' '}
              <a href={recipe.url} target="_blank" rel="noopener noreferrer">
                Vedi ricetta originale
              </a>
            </p>
          )}
        </div>

        <h4 style={{ marginBottom: '10px' }}>Ingredienti:</h4>
        <ul className="ingredient-list">
          {recipe.ingredients?.map((ing, index) => (
            <li key={index}>
              {ing.original}
            </li>
          ))}
        </ul>

        {recipe.instructions && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '12px' }}>👨‍🍳 Preparazione:</h4>
            <div className="instructions-content">
              {recipe.instructions.split('\n').map((line, idx) => (
                line.trim() && (
                  <p key={idx} style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                    {line}
                  </p>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
