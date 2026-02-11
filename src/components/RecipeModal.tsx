'use client';

import { useState } from 'react';
import type { Recipe } from '@/types/recipe';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
  onUpdateServings?: (recipeId: number, servings: string) => void;
  onUpdateRecipe?: (recipeId: number, updates: {
    name?: string;
    servings?: string;
    instructions?: string;
    prepTime?: string;
    totalTime?: string;
    image?: string;
    ingredients?: string;
  }) => void;
}

export default function RecipeModal({ recipe, onClose, onUpdateServings, onUpdateRecipe }: RecipeModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingServings, setIsEditingServings] = useState(false);
  
  // Edit state
  const [editedName, setEditedName] = useState(recipe.name || '');
  const [editedServings, setEditedServings] = useState(recipe.servings || '');
  const [editedPrepTime, setEditedPrepTime] = useState(recipe.jsonldSource?.prepTime || '');
  const [editedTotalTime, setEditedTotalTime] = useState(recipe.jsonldSource?.totalTime || '');
  const [editedInstructions, setEditedInstructions] = useState(recipe.instructions || '');
  const [editedImage, setEditedImage] = useState(recipe.image || '');
  const [editedIngredients, setEditedIngredients] = useState(
    recipe.ingredients?.map(ing => ing.original).join('\n') || ''
  );
  
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
        totalTime: editedTotalTime,
        instructions: editedInstructions,
        image: editedImage,
        ingredients: editedIngredients
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(recipe.name || '');
    setEditedServings(recipe.servings || '');
    setEditedPrepTime(recipe.jsonldSource?.prepTime || '');
    setEditedTotalTime(recipe.jsonldSource?.totalTime || '');
    setEditedInstructions(recipe.instructions || '');
    setEditedImage(recipe.image || '');
    setEditedIngredients(recipe.ingredients?.map(ing => ing.original).join('\n') || '');
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
          <button className="close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
        {isEditing ? (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              🖼️ URL Immagine:
            </label>
            <input
              type="text"
              value={editedImage}
              onChange={(e) => setEditedImage(e.target.value)}
              placeholder="https://esempio.com/immagine.jpg"
              style={{
                padding: '8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                width: '100%',
                marginBottom: '12px'
              }}
            />
            {editedImage && (
              <img
                src={editedImage}
                alt="Preview"
                style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
        ) : (
          recipe.image && (
            <img
              src={recipe.image}
              alt={recipe.name}
              style={{ width: '100%', borderRadius: '8px', marginBottom: '20px' }}
            />
          )
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
                  placeholder="es. 15 minuti"
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
                  <i className="bi bi-clock-fill"></i> Tempo totale (preparazione + cottura):
                </label>
                <input
                  type="text"
                  value={editedTotalTime}
                  onChange={(e) => setEditedTotalTime(e.target.value)}
                  placeholder="es. 45 minuti"
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {recipe.jsonldSource?.prepTime && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--card-bg, #f8f9fa)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="bi bi-clock" style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}></i>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        Preparazione
                      </div>
                      <div style={{ fontWeight: '600' }}>{recipe.jsonldSource.prepTime}</div>
                    </div>
                  </div>
                )}
                
                {recipe.jsonldSource?.totalTime && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--card-bg, #f8f9fa)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="bi bi-clock-fill" style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}></i>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        Tempo totale
                      </div>
                      <div style={{ fontWeight: '600' }}>{recipe.jsonldSource.totalTime}</div>
                    </div>
                  </div>
                )}

                {!recipe.jsonldSource?.prepTime && !recipe.jsonldSource?.totalTime && recipe.prepTime && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--card-bg, #f8f9fa)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="bi bi-clock" style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}></i>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        Tempo
                      </div>
                      <div style={{ fontWeight: '600' }}>{recipe.prepTime}</div>
                    </div>
                  </div>
                )}
                
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--card-bg, #f8f9fa)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>👥</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      Porzioni
                    </div>
                    <div style={{ fontWeight: '600' }}>
                      {recipe.servings || 
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 'normal' }}>
                          Non disponibile
                        </span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              {recipe.url && !recipe.url.startsWith('manual://') ? (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--primary-color)',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <a 
                    href={recipe.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-link-45deg" style={{ fontSize: '1.2rem' }}></i>
                    <span>Vedi ricetta originale</span>
                    <i className="bi bi-arrow-up-right" style={{ marginLeft: 'auto' }}></i>
                  </a>
                </div>
              ) : (
                <div 
                  style={{
                    padding: '12px 16px',
                    background: '#e0e0e0',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    cursor: 'not-allowed'
                  }}
                  title="Questa è una ricetta creata manualmente, non ha un sito web di origine"
                >
                  <div
                    style={{
                      color: '#666',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '500',
                      opacity: 0.6
                    }}
                  >
                    <i className="bi bi-link-45deg" style={{ fontSize: '1.2rem' }}></i>
                    <span>Ricetta manuale - nessun sito web</span>
                    <i className="bi bi-pencil-square" style={{ marginLeft: 'auto' }}></i>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <h4 style={{ marginBottom: '10px' }}>Ingredienti:</h4>
        {isEditing ? (
          <div style={{ marginBottom: '20px' }}>
            <textarea
              value={editedIngredients}
              onChange={(e) => setEditedIngredients(e.target.value)}
              placeholder="Inserisci gli ingredienti, uno per riga..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                resize: 'vertical'
              }}
            />
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
              💡 Inserisci un ingrediente per riga
            </small>
          </div>
        ) : (
          <ul className="ingredient-list">
            {recipe.ingredients?.map((ing, index) => (
              <li key={index}>
                {ing.original}
              </li>
            ))}
          </ul>
        )}

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

        {/* Action buttons at bottom */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border)'
        }}>
          {isEditing ? (
            <>
              <button 
                className="btn btn-outline"
                onClick={handleCancelEdit}
              >
                Annulla
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveAll}
              >
                ✓ Salva Modifiche
              </button>
            </>
          ) : (
            onUpdateRecipe && (
              <button
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                <i className="bi bi-pencil"></i> Modifica Ricetta
              </button>
            )
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
