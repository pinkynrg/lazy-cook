'use client';

import type { Recipe, RecipeDayAssignment } from '@/types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  assignment?: RecipeDayAssignment;
  onView: (recipe: Recipe) => void;
  onRemove: (id: number) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  showServings?: boolean;
  editingServingsId?: number;
  servingsInput?: string;
  onStartEditServings?: (assignment: RecipeDayAssignment, e: React.MouseEvent) => void;
  onSaveServings?: (assignmentId: number) => void;
  onCancelEditServings?: () => void;
  onServingsInputChange?: (value: string) => void;
}

export default function RecipeCard({
  recipe,
  assignment,
  onView,
  onRemove,
  draggable = false,
  onDragStart,
  showServings = false,
  editingServingsId,
  servingsInput,
  onStartEditServings,
  onSaveServings,
  onCancelEditServings,
  onServingsInputChange
}: RecipeCardProps) {
  return (
    <div
      className="recipe-card-mini"
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {recipe.image && (
        <div className="recipe-card-mini-image">
          <img src={recipe.image} alt={recipe.name} draggable="false" />
        </div>
      )}
      <div className="recipe-card-content">
        <span className="recipe-card-title">{recipe.name}</span>
        {showServings && assignment && (
          <>
            {editingServingsId === assignment.id ? (
              <div className="servings-edit" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  min="1"
                  value={servingsInput}
                  onChange={(e) => onServingsInputChange?.(e.target.value)}
                  placeholder="es. 4"
                  className="servings-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveServings?.(assignment.id);
                    if (e.key === 'Escape') onCancelEditServings?.();
                  }}
                />
                <button 
                  onClick={() => onSaveServings?.(assignment.id)} 
                  className="servings-btn-save" 
                  title="Salva"
                >
                  ✓
                </button>
                <button 
                  onClick={onCancelEditServings} 
                  className="servings-btn-cancel" 
                  title="Annulla"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span 
                className="planned-servings"
                onClick={(e) => onStartEditServings?.(assignment, e)}
                title="Porzioni pianificate per questo pasto - clicca per modificare"
              >
                <i className="bi bi-dish"></i> {assignment.plannedServings}
              </span>
            )}
          </>
        )}
      </div>
      <div className="recipe-card-actions">
        <button
          className="recipe-btn-view"
          onClick={() => onView(recipe)}
          title="Visualizza ricetta"
        >
          <i className="bi bi-eye-fill"></i>
        </button>
        <button
          className="recipe-btn-remove"
          onClick={() => onRemove(assignment?.id || recipe.id)}
          title="Rimuovi"
        >
          <i className="bi bi-trash"></i>
        </button>
      </div>
    </div>
  );
}
