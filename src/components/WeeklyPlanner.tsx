'use client';

import { useState, useEffect } from 'react';
import type { Recipe, RecipeDayAssignment } from '@/types/recipe';

interface WeeklyPlannerProps {
  recipes: Recipe[];
  onUpdateDay: (recipeId: number, day: number | null) => void;
  onViewRecipe: (recipe: Recipe) => void;
  onRemoveRecipe: (id: number) => void;
  onUpdateServings: (recipeId: number, servings: string) => void;
  onAddAssignment: (recipeId: number, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner') => void;
  onRemoveAssignment: (assignmentId: number) => void;
  onUpdateAssignmentServings: (assignmentId: number, plannedServings: number) => void;
  onMoveAssignment: (assignmentId: number, dayOfWeek: number, mealType: 'breakfast' | 'lunch' | 'dinner') => void;
  onAddRecipe: (recipe: Recipe) => void;
  enableBreakfast: boolean;
  enableLunch: boolean;
  enableDinner: boolean;
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

type MealOutKey = `${number}-${'breakfast' | 'lunch' | 'dinner'}`;

export default function WeeklyPlanner({ recipes, onUpdateDay, onViewRecipe, onRemoveRecipe, onUpdateServings, onAddAssignment, onRemoveAssignment, onUpdateAssignmentServings, onMoveAssignment, onAddRecipe, enableBreakfast, enableLunch, enableDinner }: WeeklyPlannerProps) {
  const [editingServingsId, setEditingServingsId] = useState<number | null>(null);
  const [servingsInput, setServingsInput] = useState('');
  const [selectingRecipeFor, setSelectingRecipeFor] = useState<{ day: number; meal: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [assignmentServingsInput, setAssignmentServingsInput] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [mealsOut, setMealsOut] = useState<Set<MealOutKey>>(new Set());

  // Load eating out status from database on mount and when recipes change
  useEffect(() => {
    const loadEatingOutStatus = async () => {
      try {
        const response = await fetch('/api/recipe-assignments/eating-out');
        if (response.ok) {
          const { eatingOutMeals } = await response.json();
          const newSet = new Set<MealOutKey>();
          eatingOutMeals.forEach((meal: { dayOfWeek: number; mealType: string }) => {
            newSet.add(`${meal.dayOfWeek}-${meal.mealType}` as MealOutKey);
          });
          setMealsOut(newSet);
        }
      } catch (error) {
        console.error('Error loading eating out status:', error);
      }
    };
    loadEatingOutStatus();
  }, [recipes]); // Reload when recipes change (e.g., after plan restore)

  const toggleMealOut = async (day: number, meal: 'breakfast' | 'lunch' | 'dinner') => {
    const key: MealOutKey = `${day}-${meal}`;
    const isCurrentlyOut = mealsOut.has(key);
    const newEatingOut = !isCurrentlyOut;
    
    // Optimistically update UI
    setMealsOut(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });

    // Persist to database
    try {
      const response = await fetch('/api/recipe-assignments/eating-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek: day, mealType: meal, eatingOut: newEatingOut }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle eating out status');
      }
    } catch (error) {
      console.error('Error toggling eating out:', error);
      // Revert on error
      setMealsOut(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    }
  };

  const isMealOut = (day: number, meal: 'breakfast' | 'lunch' | 'dinner') => {
    return mealsOut.has(`${day}-${meal}`);
  };

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

  const handleDrop = (e: React.DragEvent, dayId: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
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

  const getRecipesForDay = (dayId: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
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
      <h2><i className="bi bi-calendar-week"></i> Piano Settimanale</h2>

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
              
              {/* Breakfast Section */}
              {enableBreakfast && (
              <div className={`meal-section ${isMealOut(day.id, 'breakfast') ? 'meal-out' : ''}`}>
                <div className="meal-header">
                  <span className="meal-title">Colazione</span>
                  <div className="meal-header-actions">
                    {!isMealOut(day.id, 'breakfast') && (
                      <button 
                        className="meal-add-btn-header"
                        onClick={() => setSelectingRecipeFor(
                          selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'breakfast' 
                            ? null 
                            : { day: day.id, meal: 'breakfast' }
                        )}
                        title="Aggiungi ricetta"
                      >
                        {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'breakfast' ? '✕' : '+'}
                      </button>
                    )}
                    {!isMealOut(day.id, 'breakfast') && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'breakfast') && (
                      <button 
                        className={`meal-out-btn ${isMealOut(day.id, 'breakfast') ? 'active' : ''}`}
                        onClick={() => toggleMealOut(day.id, 'breakfast')}
                        title={isMealOut(day.id, 'breakfast') ? 'Torna a cucinare' : 'Mangiamo fuori'}
                      >
                        <i className={isMealOut(day.id, 'breakfast') ? 'bi bi-house-fill' : 'bi bi-shop'}></i>
                      </button>
                    )}
                    {isMealOut(day.id, 'breakfast') && (
                      <button 
                        className="meal-out-btn active"
                        onClick={() => toggleMealOut(day.id, 'breakfast')}
                        title="Torna a cucinare"
                      >
                        <i className="bi bi-house-fill"></i>
                      </button>
                    )}
                  </div>
                </div>
                
                {isMealOut(day.id, 'breakfast') ? (
                  <div className="meal-out-message">
                    <i className="bi bi-shop"></i>
                    <span>Mangiamo fuori</span>
                  </div>
                ) : (
                  <>
                {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'breakfast' && (
                  <div className="recipe-selector">
                    {recipes.map(recipe => (
                      <button
                        key={recipe.id}
                        className="recipe-selector-item"
                        onClick={() => {
                          onAddAssignment(recipe.id, day.id, 'breakfast');
                          setSelectingRecipeFor(null);
                        }}
                      >
                        {recipe.name}
                      </button>
                    ))}
                  </div>
                )}
                
                {!(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'breakfast') && (
                <div 
                  className="meal-recipes"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.id, 'breakfast')}
                >
                  {(() => {
                    const breakfastRecipes = getRecipesForDay(day.id, 'breakfast');
                    return breakfastRecipes.length === 0 && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'breakfast') ? (
                      <div 
                        className="empty-meal"
                        onClick={() => setSelectingRecipeFor({ day: day.id, meal: 'breakfast' })}
                        style={{ cursor: 'pointer' }}
                      >
                        + Aggiungi o trascina qui
                      </div>
                    ) : breakfastRecipes.length === 0 ? null : (
                      <>
                      {breakfastRecipes.map(({ assignment, recipe }) => (
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
                              <span className="recipe-card-title">{recipe.name}</span>
                            )}
                          </div>
                          <div className="recipe-card-actions">
                            {editingAssignmentId !== assignment.id && (
                              <button 
                                className="recipe-btn-servings"
                                onClick={(e) => startEditingAssignmentServings(assignment, e)}
                                title="Porzioni pianificate per questo pasto - clicca per modificare"
                              >
                                <i className="bi bi-person-fill"></i> {assignment.plannedServings}
                              </button>
                            )}
                            <button 
                              className="recipe-btn-view"
                              onClick={() => onViewRecipe(recipe)}
                              title="Visualizza ricetta"
                            >
                              <i className="bi bi-eye-fill"></i>
                            </button>
                            <button 
                              className="recipe-btn-remove"
                              onClick={() => onRemoveAssignment(assignment.id)}
                              title="Rimuovi"
                            >
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                      </>
                    );
                  })()}
                </div>
                )}
                </>
                )}
              </div>
              )}

              {/* Lunch Section */}
              {enableLunch && (
              <div className={`meal-section ${isMealOut(day.id, 'lunch') ? 'meal-out' : ''}`}>
                <div className="meal-header">
                  <span className="meal-title">Pranzo</span>
                  <div className="meal-header-actions">
                    {!isMealOut(day.id, 'lunch') && (
                      <button 
                        className="meal-add-btn-header"
                        onClick={() => setSelectingRecipeFor(
                          selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch' 
                            ? null 
                            : { day: day.id, meal: 'lunch' }
                        )}
                        title="Aggiungi ricetta"
                      >
                        {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch' ? '✕' : '+'}
                      </button>
                    )}
                    {!isMealOut(day.id, 'lunch') && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch') && (
                      <button 
                        className={`meal-out-btn ${isMealOut(day.id, 'lunch') ? 'active' : ''}`}
                        onClick={() => toggleMealOut(day.id, 'lunch')}
                        title={isMealOut(day.id, 'lunch') ? 'Torna a cucinare' : 'Mangiamo fuori'}
                      >
                        <i className={isMealOut(day.id, 'lunch') ? 'bi bi-house-fill' : 'bi bi-shop'}></i>
                      </button>
                    )}
                    {isMealOut(day.id, 'lunch') && (
                      <button 
                        className="meal-out-btn active"
                        onClick={() => toggleMealOut(day.id, 'lunch')}
                        title="Torna a cucinare"
                      >
                        <i className="bi bi-house-fill"></i>
                      </button>
                    )}
                  </div>
                </div>
                
                {isMealOut(day.id, 'lunch') ? (
                  <div className="meal-out-message">
                    <i className="bi bi-shop"></i>
                    <span>Mangiamo fuori</span>
                  </div>
                ) : (
                  <>
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
                
                {!(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch') && (
                <div 
                  className="meal-recipes"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.id, 'lunch')}
                >
                  {lunchRecipes.length === 0 && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'lunch') ? (
                      <div 
                        className="empty-meal"
                        onClick={() => setSelectingRecipeFor({ day: day.id, meal: 'lunch' })}
                        style={{ cursor: 'pointer' }}
                      >
                        + Aggiungi o trascina qui
                      </div>
                  ) : lunchRecipes.length === 0 ? null : (
                    <>
                    {lunchRecipes.map(({ assignment, recipe }) => (
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
                            <span className="recipe-card-title">{recipe.name}</span>
                          )}
                        </div>
                        <div className="recipe-card-actions">
                          {editingAssignmentId !== assignment.id && (
                            <button 
                              className="recipe-btn-servings"
                              onClick={(e) => startEditingAssignmentServings(assignment, e)}
                              title="Porzioni pianificate per questo pasto - clicca per modificare"
                            >
                              <i className="bi bi-person-fill"></i> {assignment.plannedServings}
                            </button>
                          )}
                          <button 
                            className="recipe-btn-view"
                            onClick={() => onViewRecipe(recipe)}
                            title="Visualizza ricetta"
                          >
                            <i className="bi bi-eye-fill"></i>
                          </button>
                          <button 
                            className="recipe-btn-remove"
                            onClick={() => onRemoveAssignment(assignment.id)}
                            title="Rimuovi"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                    </>
                  )}
                </div>
                )}
                </>
                )}
              </div>
              )}

              {/* Dinner Section */}
              {enableDinner && (
              <div className={`meal-section ${isMealOut(day.id, 'dinner') ? 'meal-out' : ''}`}>
                <div className="meal-header">
                  <span className="meal-title">Cena</span>
                  <div className="meal-header-actions">
                    {!isMealOut(day.id, 'dinner') && (
                      <button 
                        className="meal-add-btn-header"
                        onClick={() => setSelectingRecipeFor(
                          selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner' 
                            ? null 
                            : { day: day.id, meal: 'dinner' }
                        )}
                        title="Aggiungi ricetta"
                      >
                        {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner' ? '✕' : '+'}
                      </button>
                    )}
                    {!isMealOut(day.id, 'dinner') && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner') && (
                      <button 
                        className={`meal-out-btn ${isMealOut(day.id, 'dinner') ? 'active' : ''}`}
                        onClick={() => toggleMealOut(day.id, 'dinner')}
                        title={isMealOut(day.id, 'dinner') ? 'Torna a cucinare' : 'Mangiamo fuori'}
                      >
                        <i className={isMealOut(day.id, 'dinner') ? 'bi bi-house-fill' : 'bi bi-shop'}></i>
                      </button>
                    )}
                    {isMealOut(day.id, 'dinner') && (
                      <button 
                        className="meal-out-btn active"
                        onClick={() => toggleMealOut(day.id, 'dinner')}
                        title="Torna a cucinare"
                      >
                        <i className="bi bi-house-fill"></i>
                      </button>
                    )}
                  </div>
                </div>
                
                {isMealOut(day.id, 'dinner') ? (
                  <div className="meal-out-message">
                    <i className="bi bi-shop"></i>
                    <span>Mangiamo fuori</span>
                  </div>
                ) : (
                  <>
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
                
                {!(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner') && (
                <div 
                  className="meal-recipes"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.id, 'dinner')}
                >
                  {dinnerRecipes.length === 0 && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === 'dinner') ? (
                      <div 
                        className="empty-meal"
                        onClick={() => setSelectingRecipeFor({ day: day.id, meal: 'dinner' })}
                        style={{ cursor: 'pointer' }}
                      >
                        + Aggiungi o trascina qui
                      </div>
                  ) : dinnerRecipes.length === 0 ? null : (
                    <>
                    {dinnerRecipes.map(({ assignment, recipe }) => (
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
                            <span className="recipe-card-title">{recipe.name}</span>
                          )}
                        </div>
                        <div className="recipe-card-actions">
                          {editingAssignmentId !== assignment.id && (
                            <button 
                              className="recipe-btn-servings"
                              onClick={(e) => startEditingAssignmentServings(assignment, e)}
                              title="Porzioni pianificate per questo pasto - clicca per modificare"
                            >
                              <i className="bi bi-person-fill"></i> {assignment.plannedServings}
                            </button>
                          )}
                          <button 
                            className="recipe-btn-view"
                            onClick={() => onViewRecipe(recipe)}
                            title="Visualizza ricetta"
                          >
                            <i className="bi bi-eye-fill"></i>
                          </button>
                          <button 
                            className="recipe-btn-remove"
                            onClick={() => onRemoveAssignment(assignment.id)}
                            title="Rimuovi"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                    </>
                  )}
                </div>
                )}
                </>
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
