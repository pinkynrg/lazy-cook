'use client';

import { useState } from 'react';
import type { Recipe, RecipeDayAssignment } from '@/types/recipe';

interface WeeklyPlannerProps {
  recipes: Recipe[];
  onUpdateDay: (recipeId: number, day: number | null) => void;
  onViewRecipe: (recipe: Recipe) => void;
  onRemoveRecipe: (id: number) => void;
  onUpdateServings: (recipeId: number, servings: string) => void;
  onAddAssignment: (recipeId: number, dayOfWeek: number, mealType: 'lunch' | 'dinner') => void;
  onRemoveAssignment: (assignmentId: number) => void;
  onUpdateAssignmentServings: (assignmentId: number, plannedServings: number) => void;
  onMoveAssignment: (assignmentId: number, dayOfWeek: number, mealType: 'lunch' | 'dinner') => void;
  onAddRecipe: (recipe: Recipe) => void;
}

const DAYS = [
  { id: 0, name: 'Lunedì', short: 'Lun' },
  { id: 1, name: 'Martedì', short: 'Mar' },
  { id: 2, name: 'Mercoledì', short: 'Mer' },
  { id: 3, name: 'Giovedì', short: 'Gio' },
  { id: 4, name: 'Venerdì', short: 'Ven' },
  { id: 5, name: 'Sabato', short: 'Sab' },
  { id: 6, name: 'Domenica', short: 'Dom' },
];

export default function WeeklyPlanner({ recipes, onUpdateDay, onViewRecipe, onRemoveRecipe, onUpdateServings, onAddAssignment, onRemoveAssignment, onUpdateAssignmentServings, onMoveAssignment, onAddRecipe }: WeeklyPlannerProps) {
  const [editingServingsId, setEditingServingsId] = useState<number | null>(null);
  const [servingsInput, setServingsInput] = useState('');
  const [selectingRecipeFor, setSelectingRecipeFor] = useState<{ day: number; meal: 'lunch' | 'dinner' } | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [assignmentServingsInput, setAssignmentServingsInput] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const scrollToDay = (dayId: number) => {
    setExpandedDay(dayId);
    setTimeout(() => {
      const element = document.getElementById(`day-${dayId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const toggleDay = (dayId: number) => {
    if (expandedDay === dayId) {
      // If clicking the currently expanded day, close it
      setExpandedDay(null);
    } else {
      // Otherwise, open the clicked day
      setExpandedDay(dayId);
      setTimeout(() => {
        const element = document.getElementById(`day-${dayId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleDragStart = (e: React.DragEvent, recipeId: number) => {
    e.dataTransfer.setData('recipeId', recipeId.toString());
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleAssignmentDragStart = (e: React.DragEvent, assignmentId: number) => {
    e.dataTransfer.setData('assignmentId', assignmentId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const hasAssignment = e.dataTransfer.types.includes('assignmentid');
    e.dataTransfer.dropEffect = hasAssignment ? 'move' : 'copy';
  };

  const handleDrop = (e: React.DragEvent, dayId: number, mealType: 'lunch' | 'dinner') => {
    e.preventDefault();
    const recipeId = e.dataTransfer.getData('recipeId');
    const assignmentId = e.dataTransfer.getData('assignmentId');
    
    if (assignmentId) {
      // Moving an existing assignment
      onMoveAssignment(parseInt(assignmentId), dayId, mealType);
    } else if (recipeId) {
      // Adding a new assignment from library
      onAddAssignment(parseInt(recipeId), dayId, mealType);
    }
  };

  const startEditingServings = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingServingsId(recipe.id);
    setServingsInput(recipe.servings || '');
  };

  const saveServings = (recipeId: number) => {
    onUpdateServings(recipeId, servingsInput);
    setEditingServingsId(null);
  };

  const cancelEditingServings = () => {
    setEditingServingsId(null);
    setServingsInput('');
  };

  const startEditingAssignmentServings = (assignment: RecipeDayAssignment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAssignmentId(assignment.id);
    setAssignmentServingsInput(assignment.plannedServings.toString());
  };

  const saveAssignmentServings = (assignmentId: number) => {
    const servings = parseInt(assignmentServingsInput);
    if (servings && servings > 0) {
      onUpdateAssignmentServings(assignmentId, servings);
    }
    setEditingAssignmentId(null);
  };

  const cancelEditingAssignmentServings = () => {
    setEditingAssignmentId(null);
    setAssignmentServingsInput('');
  };

  const getRecipesForDay = (dayId: number, mealType: 'lunch' | 'dinner') => {
    // Get all assignments for this day and meal type
    const dayAssignments: Array<{ assignment: RecipeDayAssignment; recipe: Recipe }> = [];
    
    recipes.forEach(recipe => {
      if (recipe.assignments) {
        recipe.assignments
          .filter(a => a.dayOfWeek === dayId && a.mealType === mealType)
          .forEach(assignment => {
            dayAssignments.push({ assignment, recipe });
          });
      }
    });
    
    return dayAssignments;
  };

  const unassignedRecipes = recipes;

  return (
    <div className="weekly-planner">
      <h2>📅 Piano Settimanale</h2>

      {/* Day Navigator for Mobile */}
      <div className="day-navigator">
        {DAYS.map(day => (
          <button
            key={day.id}
            className="day-nav-btn"
            onClick={() => scrollToDay(day.id)}
            title={day.name}
          >
            {day.short}
          </button>
        ))}
      </div>

      {/* Week grid */}
      <div className="week-grid">
        {DAYS.map(day => {
          const lunchRecipes = getRecipesForDay(day.id, 'lunch');
          const dinnerRecipes = getRecipesForDay(day.id, 'dinner');
          
          return (
            <div
              key={day.id}
              id={`day-${day.id}`}
              className={`day-column ${expandedDay !== day.id ? 'collapsed' : ''}`}
            >
              <div 
                className="day-header"
                onClick={() => toggleDay(day.id)}
              >
                <div className="day-name">{day.name}</div>
                <button className="day-toggle-btn" type="button">
                  {expandedDay === day.id ? '▼' : '▶'}
                </button>
              </div>
              
              {/* Lunch Section */}
              <div className="meal-section">
                <div className="meal-header">
                  <span className="meal-title">☀️ Pranzo</span>
                  <button 
                    className="day-add-btn"
                    onClick={() => setSelectingRecipeFor(
                      selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch' 
                        ? null 
                        : { day: day.id, meal: 'lunch' }
                    )}
                    title="Aggiungi ricetta"
                  >
                    {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch' ? '✕' : '+'}
                  </button>
                </div>
                
                {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch' && (
                  <div className="recipe-selector">
                    {recipes.map(recipe => (
                      <button
                        key={recipe.id}
                        className="recipe-selector-item"
                        onClick={() => {
                          onAddAssignment(recipe.id, day.id, 'lunch');
                          setSelectingRecipeFor(null);
                        }}
                      >
                        {recipe.name}
                      </button>
                    ))}
                  </div>
                )}
                
                <div 
                  className="meal-recipes"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.id, 'lunch')}
                >
                  {lunchRecipes.length === 0 ? (
                    <div 
                      className="empty-meal"
                      onClick={() => setSelectingRecipeFor({ day: day.id, meal: 'lunch' })}
                      style={{ cursor: 'pointer' }}
                    >
                      Trascina qui o clicca +
                    </div>
                  ) : (
                    lunchRecipes.map(({ assignment, recipe }) => (
                      <div
                        key={assignment.id}
                        className="recipe-card-mini"
                        draggable
                        onDragStart={(e) => handleAssignmentDragStart(e, assignment.id)}
                      >
                        {recipe.image && (
                          <div className="recipe-card-mini-image">
                            <img src={recipe.image} alt={recipe.name} />
                          </div>
                        )}
                        <div className="recipe-card-content">
                          <span className="recipe-card-title">{recipe.name}</span>
                          {editingAssignmentId === assignment.id ? (
                            <div className="servings-edit" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="1"
                                value={assignmentServingsInput}
                                onChange={(e) => setAssignmentServingsInput(e.target.value)}
                                placeholder="es. 4"
                                className="servings-input"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAssignmentServings(assignment.id);
                                  if (e.key === 'Escape') cancelEditingAssignmentServings();
                                }}
                              />
                              <button onClick={() => saveAssignmentServings(assignment.id)} className="servings-btn-save" title="Salva">✓</button>
                              <button onClick={cancelEditingAssignmentServings} className="servings-btn-cancel" title="Annulla">✕</button>
                            </div>
                          ) : (
                            <span 
                              className="planned-servings"
                              onClick={(e) => startEditingAssignmentServings(assignment, e)}
                              title="Porzioni pianificate per questo pasto - clicca per modificare"
                            >
                              🍽️ {assignment.plannedServings}
                            </span>
                          )}
                        </div>
                        <div className="recipe-card-actions">
                          <button 
                            className="recipe-btn-view"
                            onClick={() => onViewRecipe(recipe)}
                            title="Visualizza ricetta"
                          >
                            👁️
                          </button>
                          <button 
                            className="recipe-btn-remove"
                            onClick={() => onRemoveAssignment(assignment.id)}
                            title="Rimuovi"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dinner Section */}
              <div className="meal-section">
                <div className="meal-header">
                  <span className="meal-title">🌙 Cena</span>
                  <button 
                    className="day-add-btn"
                    onClick={() => setSelectingRecipeFor(
                      selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner' 
                        ? null 
                        : { day: day.id, meal: 'dinner' }
                    )}
                    title="Aggiungi ricetta"
                  >
                    {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner' ? '✕' : '+'}
                  </button>
                </div>
                
                {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner' && (
                  <div className="recipe-selector">
                    {recipes.map(recipe => (
                      <button
                        key={recipe.id}
                        className="recipe-selector-item"
                        onClick={() => {
                          onAddAssignment(recipe.id, day.id, 'dinner');
                          setSelectingRecipeFor(null);
                        }}
                      >
                        {recipe.name}
                      </button>
                    ))}
                  </div>
                )}
                
                <div 
                  className="meal-recipes"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.id, 'dinner')}
                >
                  {dinnerRecipes.length === 0 ? (
                    <div 
                      className="empty-meal"
                      onClick={() => setSelectingRecipeFor({ day: day.id, meal: 'dinner' })}
                      style={{ cursor: 'pointer' }}
                    >
                      Trascina qui o clicca +
                    </div>
                  ) : (
                    dinnerRecipes.map(({ assignment, recipe }) => (
                      <div
                        key={assignment.id}
                        className="recipe-card-mini"
                        draggable
                        onDragStart={(e) => handleAssignmentDragStart(e, assignment.id)}
                      >
                        {recipe.image && (
                          <div className="recipe-card-mini-image">
                            <img src={recipe.image} alt={recipe.name} />
                          </div>
                        )}
                        <div className="recipe-card-content">
                          <span className="recipe-card-title">{recipe.name}</span>
                          {editingAssignmentId === assignment.id ? (
                            <div className="servings-edit" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="1"
                                value={assignmentServingsInput}
                                onChange={(e) => setAssignmentServingsInput(e.target.value)}
                                placeholder="es. 4"
                                className="servings-input"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAssignmentServings(assignment.id);
                                  if (e.key === 'Escape') cancelEditingAssignmentServings();
                                }}
                              />
                              <button onClick={() => saveAssignmentServings(assignment.id)} className="servings-btn-save" title="Salva">✓</button>
                              <button onClick={cancelEditingAssignmentServings} className="servings-btn-cancel" title="Annulla">✕</button>
                            </div>
                          ) : (
                            <span 
                              className="planned-servings"
                              onClick={(e) => startEditingAssignmentServings(assignment, e)}
                              title="Porzioni pianificate per questo pasto - clicca per modificare"
                            >
                              🍽️ {assignment.plannedServings}
                            </span>
                          )}
                        </div>
                        <div className="recipe-card-actions">
                          <button 
                            className="recipe-btn-view"
                            onClick={() => onViewRecipe(recipe)}
                            title="Visualizza ricetta"
                          >
                            👁️
                          </button>
                          <button 
                            className="recipe-btn-remove"
                            onClick={() => onRemoveAssignment(assignment.id)}
                            title="Rimuovi"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
