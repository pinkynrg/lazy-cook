'use client';

import { useState, useEffect } from 'react';
import type { Recipe, RecipeDayAssignment } from '@/types/recipe';
import styles from './WeeklyPlanner.module.scss';

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
  onClearWeek: () => void;
  enableBreakfast: boolean;
  enableLunch: boolean;
  enableDinner: boolean;
  onMealsOutChange?: (mealsOut: Set<string>) => void;
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

export default function WeeklyPlanner({ recipes, onUpdateDay, onViewRecipe, onRemoveRecipe, onUpdateServings, onAddAssignment, onRemoveAssignment, onUpdateAssignmentServings, onMoveAssignment, onAddRecipe, onClearWeek, enableBreakfast, enableLunch, enableDinner, onMealsOutChange }: WeeklyPlannerProps) {
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
          onMealsOutChange?.(newSet);
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
    
    // Ask for confirmation when turning eating out ON (which will remove meals)
    if (newEatingOut) {
      const assignmentsToRemove = recipes
        .flatMap(r => r.assignments || [])
        .filter(a => a.dayOfWeek === day && a.mealType === meal);
      
      if (assignmentsToRemove.length > 0) {
        const mealNames = {
          breakfast: 'colazione',
          lunch: 'pranzo',
          dinner: 'cena'
        };
        
        if (!confirm(`Sei sicuro di voler mangiare fuori per ${mealNames[meal]}? Le ricette pianificate verranno rimosse.`)) {
          return;
        }
      }
      
      // Remove each assignment
      for (const assignment of assignmentsToRemove) {
        onRemoveAssignment(assignment.id);
      }
    }
    
    // Optimistically update UI
    setMealsOut(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      onMealsOutChange?.(newSet);
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

  // Helper function to render a meal cell
  const renderMealCell = (day: typeof DAYS[0], mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const mealRecipes = getRecipesForDay(day.id, mealType);
    const mealTitles = { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena' };
    
    return (
      <div key={`${day.id}-${mealType}`} className={`${styles.mealSlot} ${isMealOut(day.id, mealType) ? styles.eatingOutSlot : ''}`}>
        <div className={styles.mealLabel}>
          <span>{mealTitles[mealType]}</span>
          <div className={styles.servingsControl}>
            {!isMealOut(day.id, mealType) && (
              <button 
                className={styles.addRecipeBtn}
                onClick={() => setSelectingRecipeFor(
                  selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === mealType 
                    ? null 
                    : { day: day.id, meal: mealType }
                )}
                title="Aggiungi ricetta"
              >
                {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === mealType ? '✕' : '+'}
              </button>
            )}
            {!isMealOut(day.id, mealType) && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === mealType) && (
              <button 
                className={styles.addRecipeBtn}
                onClick={() => toggleMealOut(day.id, mealType)}
                title={isMealOut(day.id, mealType) ? 'Torna a cucinare' : 'Mangiamo fuori'}
              >
                <i className={isMealOut(day.id, mealType) ? 'bi bi-house-fill' : 'bi bi-shop'}></i>
              </button>
            )}
            {isMealOut(day.id, mealType) && (
              <button 
                className={styles.removeEatingOut}
                onClick={() => toggleMealOut(day.id, mealType)}
                title="Torna a cucinare"
              >
                <i className="bi bi-house-fill"></i>
              </button>
            )}
          </div>
        </div>
        
        {isMealOut(day.id, mealType) ? (
          <div className={styles.eatingOutSlot}>
            <i className="bi bi-shop"></i>
            <span>Mangiamo fuori</span>
          </div>
        ) : (
          <>
            {selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === mealType && (
              <div className={styles.mealContent}>
                {recipes.map(recipe => (
                  <button
                    key={recipe.id}
                    className={styles.addRecipeBtn}
                    onClick={() => {
                      onAddAssignment(recipe.id, day.id, mealType);
                      setSelectingRecipeFor(null);
                    }}
                  >
                    {recipe.name}
                  </button>
                ))}
              </div>
            )}
            
            {!(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === mealType) && (
              <div 
                className={styles.mealContent}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day.id, mealType)}
              >
                {mealRecipes.length === 0 && !(selectingRecipeFor?.day === day.id && selectingRecipeFor?.meal === mealType) ? (
                  <div 
                    className={styles.addRecipeBtn}
                    onClick={() => setSelectingRecipeFor({ day: day.id, meal: mealType })}
                    style={{ cursor: 'pointer' }}
                  >
                    + Aggiungi o trascina qui
                  </div>
                ) : mealRecipes.length === 0 ? null : (
                  <>
                    {mealRecipes.map(({ assignment, recipe }) => (
                      <div
                        key={assignment.id}
                        className={styles.recipeItem}
                        draggable
                        onDragStart={(e) => handleAssignmentDragStart(e, assignment.id)}
                      >
                        {recipe.image && (
                          <div className={styles.recipeImage}>
                            <img src={recipe.image} alt={recipe.name} />
                          </div>
                        )}
                        <div className={styles.recipeContent}>
                          {editingAssignmentId === assignment.id ? (
                            <div className={styles.servingsControl} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="1"
                                value={assignmentServingsInput}
                                onChange={(e) => setAssignmentServingsInput(e.target.value)}
                                placeholder="es. 4"
                                className={styles.servingsInput}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAssignmentServings(assignment.id);
                                  if (e.key === 'Escape') cancelEditingAssignmentServings();
                                }}
                              />
                              <button onClick={() => saveAssignmentServings(assignment.id)} className={styles.servingsBtn} title="Salva">✓</button>
                              <button onClick={cancelEditingAssignmentServings} className={styles.servingsBtn} title="Annulla">✕</button>
                            </div>
                          ) : (
                            <span className={styles.recipeName}>{recipe.name}</span>
                          )}
                        </div>
                        <div className={styles.recipeActions}>
                          {editingAssignmentId !== assignment.id && (
                            <button 
                              className={styles.servingsBtn}
                              onClick={(e) => startEditingAssignmentServings(assignment, e)}
                              title="Porzioni pianificate per questo pasto - clicca per modificare"
                            >
                              <i className="bi bi-person-fill"></i> {assignment.plannedServings}
                            </button>
                          )}
                          <button 
                            className={styles.servingsBtn}
                            onClick={() => onViewRecipe(recipe)}
                            title="Visualizza ricetta"
                          >
                            <i className="bi bi-eye-fill"></i>
                          </button>
                          <button 
                            className={styles.removeRecipe}
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
    );
  };

  return (
    <div className={styles.weeklyPlanner}>
      <div className={styles.weekHeader}>
        <h2><i className="bi bi-calendar-week"></i> Piano Settimanale</h2>
        <button 
          className={styles.clearAllBtn}
          onClick={() => {
            if (window.confirm('Vuoi davvero svuotare tutta la settimana? Questa azione non può essere annullata.')) {
              onClearWeek();
            }
          }}
          title="Svuota settimana"
        >
          <i className="bi bi-trash3"></i>
          <span>Svuota settimana</span>
        </button>
      </div>

      {/* Day Navigator for Mobile */}
      <div className={styles.dayNavigator}>
        {DAYS.map(day => (
          <button
            key={day.id}
            className={styles.dayNavBtn}
            onClick={() => scrollToDay(day.id)}
            title={day.name}
          >
            {day.short}
          </button>
        ))}
      </div>

      {/* Week grid - Row-based layout for desktop */}
      <div className={styles.weekGrid}>
        {/* Day headers row */}
        <div className={styles.weekRowHeaders}>
          {DAYS.map(day => (
            <div key={day.id} className={styles.dayHeader}>
              {day.name}
            </div>
          ))}
        </div>

        {/* Breakfast row */}
        {enableBreakfast && (
          <div className={styles.weekRow}>
            {DAYS.map(day => renderMealCell(day, 'breakfast'))}
          </div>
        )}

        {/* Lunch row */}
        {enableLunch && (
          <div className={styles.weekRow}>
            {DAYS.map(day => renderMealCell(day, 'lunch'))}
          </div>
        )}

        {/* Dinner row */}
        {enableDinner && (
          <div className={styles.weekRow}>
            {DAYS.map(day => renderMealCell(day, 'dinner'))}
          </div>
        )}
      </div>

      {/* Mobile column view - collapsible days */}
      <div className={styles.weekMobileView}>
        {DAYS.map(day => (
          <div
            key={day.id}
            id={`day-${day.id}`}
            className={`${styles.dayColumnMobile} ${expandedDay !== day.id ? styles.collapsed : ''}`}
          >
            <div 
              className={styles.dayHeaderMobile}
              onClick={() => toggleDay(day.id)}
            >
              <div className={styles.dayName}>{day.name}</div>
              <button className={styles.dayToggleBtn} type="button">
                {expandedDay === day.id ? '▼' : '▶'}
              </button>
            </div>
            
            {expandedDay === day.id && (
              <>
                {/* Breakfast Section */}
                {enableBreakfast && renderMealCell(day, 'breakfast')}
                
                {/* Lunch Section */}
                {enableLunch && renderMealCell(day, 'lunch')}
                
                {/* Dinner Section */}
                {enableDinner && renderMealCell(day, 'dinner')}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
