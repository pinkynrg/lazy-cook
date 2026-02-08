'use client';

import { useState } from 'react';
import type { Recipe } from '@/types/recipe';
import styles from './RecipeModal.module.scss';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
  onUpdateServings?: (recipeId: number, servings: string) => void;
  onUpdateRecipe?: (recipeId: number, updates: {
    name?: string;
    servings?: string;
    instructions?: string;
    prepTime?: string;
  }) => void;
}

export default function RecipeModal({ recipe, onClose, onUpdateServings, onUpdateRecipe }: RecipeModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingServings, setIsEditingServings] = useState(false);
  
  // Edit state
  const [editedName, setEditedName] = useState(recipe.name || '');
  const [editedServings, setEditedServings] = useState(recipe.servings || '');
  const [editedPrepTime, setEditedPrepTime] = useState(recipe.prepTime || '');
  const [editedInstructions, setEditedInstructions] = useState(recipe.instructions || '');
  
  const [servingsInput, setServingsInput] = useState(recipe.servings || '');

  const handleSaveServings = () => {
    if (onUpdateServings && recipe.id) {
      onUpdateServings(recipe.id, servingsInput);
    }
    setIsEditingServings(false);
  };

  const handleSaveAll = () => {
    if (onUpdateRecipe && recipe.id) {
      onUpdateRecipe(recipe.id, {
        name: editedName,
        servings: editedServings,
        prepTime: editedPrepTime,
        instructions: editedInstructions
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(recipe.name || '');
    setEditedServings(recipe.servings || '');
    setEditedPrepTime(recipe.prepTime || '');
    setEditedInstructions(recipe.instructions || '');
    setIsEditing(false);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                padding: '4px 8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                width: '100%',
                marginRight: '8px'
              }}
            />
          ) : (
            <h3>{recipe.name}</h3>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditing ? (
              <>
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={handleSaveAll}
                  title="Salva modifiche"
                >
                  ✓ Salva
                </button>
                <button 
                  className="btn btn-small btn-outline"
                  onClick={handleCancelEdit}
                  title="Annulla"
                >
                  ✕ Annulla
                </button>
              </>
            ) : (
              onUpdateRecipe && (
                <button
                  className="btn btn-small btn-outline"
                  onClick={() => setIsEditing(true)}
                  title="Modifica ricetta"
                >
                  <i className="bi bi-pencil"></i> Modifica
                </button>
              )
            )}
            <button className="close" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        {recipe.image && (
          <img
            src={recipe.image}
            alt={recipe.name}
            style={{ width: '100%', borderRadius: '8px', marginBottom: '20px' }}
          />
        )}

        <div style={{ marginBottom: '20px' }}>
          {isEditing ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  <i className="bi bi-clock"></i> Tempo di preparazione:
                </label>
                <input
                  type="text"
                  value={editedPrepTime}
                  onChange={(e) => setEditedPrepTime(e.target.value)}
                  placeholder="es. 30 minuti"
                  style={{
                    padding: '8px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    width: '100%'
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  👥 Porzioni:
                </label>
                <input
                  type="text"
                  value={editedServings}
                  onChange={(e) => setEditedServings(e.target.value)}
                  placeholder="es. 4"
                  style={{
                    padding: '8px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    width: '100%'
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {recipe.prepTime && <p><i className="bi bi-clock"></i> Tempo: {recipe.prepTime}</p>}
              
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
                    {onUpdateServings && !isEditing && (
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
            </>
          )}

          {recipe.url && (
            <p>
              <i className="bi bi-link-45deg"></i>{' '}
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

        {(recipe.instructions || isEditing) && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '12px' }}>👨‍🍳 Preparazione:</h4>
            {isEditing ? (
              <textarea
                value={editedInstructions}
                onChange={(e) => setEditedInstructions(e.target.value)}
                placeholder="Inserisci le istruzioni di preparazione..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  resize: 'vertical'
                }}
              />
            ) : (
              <div className="instructions-content">
                {recipe.instructions?.split('\n').map((line, idx) => (
                  line.trim() && (
                    <p key={idx} style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                      {line}
                    </p>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
