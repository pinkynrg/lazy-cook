'use client';

import { useState, useEffect } from 'react';
import type { Recipe, RecipeDayAssignment } from '@/types/recipe';
import OnlineRecipeSearch from '@/components/OnlineRecipeSearch/OnlineRecipeSearch';

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

export default function WeeklyPlanner({ recipes, onUpdateDay: _onUpdateDay, onViewRecipe, onRemoveRecipe: _onRemoveRecipe, onUpdateServings: _onUpdateServings, onAddAssignment, onRemoveAssignment, onUpdateAssignmentServings, onMoveAssignment, onAddRecipe, onClearWeek, enableBreakfast, enableLunch, enableDinner, onMealsOutChange }: WeeklyPlannerProps) {
  const [selectingRecipeFor, setSelectingRecipeFor] = useState<{ day: number; meal: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [assignmentServingsInput, setAssignmentServingsInput] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [mealsOut, setMealsOut] = useState<Set<MealOutKey>>(new Set());
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [pendingAssignment, setPendingAssignment] = useState<{ url: string; day: number; meal: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const [searchMode, setSearchMode] = useState<'local' | 'online'>('local');

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
  }, [recipes, onMealsOutChange]); // Reload when recipes change (e.g., after plan restore)

  // Handle pending assignment after recipe is added
  useEffect(() => {
    if (pendingAssignment) {
      // Find the recipe that was just added by matching URL
      const newRecipe = recipes.find(r => 
        r.jsonldSource?.url === pendingAssignment.url
      );
      
      if (newRecipe) {
        // Recipe found, assign it
        onAddAssignment(newRecipe.id, pendingAssignment.day, pendingAssignment.meal);
        setSelectingRecipeFor(null);
        setRecipeSearchTerm('');
        setPendingAssignment(null);
      }
    }
  }, [recipes, pendingAssignment, onAddAssignment]);

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

  const handleSelectSearchResult = async (result: { url: string; term: string; image?: string }) => {
    if (!selectingRecipeFor) return;
    
    const { url } = result;
    const { day, meal } = selectingRecipeFor;
    
    try {
      const response = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Errore durante l\'estrazione della ricetta');
        return;
      }

      const { recipe: jsonld } = await response.json();
      if (!jsonld.url && !jsonld['@id']) {
        jsonld.url = url;
      }
      
      const recipe = {
        id: Date.now(),
        jsonldSource: jsonld,
        dateAdded: new Date().toISOString(),
      };
      
      // Set pending assignment before adding recipe
      setPendingAssignment({ url, day, meal });
      
      // Add recipe to library - the useEffect will handle assignment once it appears in the list
      onAddRecipe(recipe);
      
      // Close modal
      setSelectingRecipeFor(null);
      setRecipeSearchTerm('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore durante l\'estrazione della ricetta';
      alert(errorMessage);
    }
  };

  const scrollToDay = (dayId: number) => {
    setExpandedDay(dayId);
    setTimeout(() => {
      const element = document.getElementById(`day-${dayId}`);
      if (element) {
        const yOffset = -80; // Offset for header
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
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
          const yOffset = -80; // Offset for header
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const _handleDragStart = (e: React.DragEvent, recipeId: number) => {
    e.dataTransfer.setData('recipeId', recipeId.toString());
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleAssignmentDragStart = (e: React.DragEvent, assignmentId: number) => {
    e.dataTransfer.setData('assignmentId', assignmentId.toString());
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStartPos(null);
  };

  const handleCardMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button') || target.closest('input')) {
      return;
    }
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleCardClick = (recipe: Recipe, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button') || target.closest('input')) {
      return;
    }

    if (isDragging) {
      setDragStartPos(null);
      return;
    }

    if (dragStartPos) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.x, 2) + 
        Math.pow(e.clientY - dragStartPos.y, 2)
      );
      
      if (distance < 5) {
        onViewRecipe(recipe);
      }
    } else {
      onViewRecipe(recipe);
    }
    
    setDragStartPos(null);
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

  const closeModal = () => {
    setSelectingRecipeFor(null);
    setRecipeSearchTerm('');
  };

  // Helper function to render a meal cell
  const renderMealCell = (day: typeof DAYS[0], mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const mealRecipes = getRecipesForDay(day.id, mealType);
    const mealTitles = { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena' };
    
    return (
      <div key={`${day.id}-${mealType}`} className={`meal-cell ${isMealOut(day.id, mealType) ? 'meal-out' : ''}`}>
        <div className={`meal-header meal-type-${mealType}`}>
          <span className="meal-title">{mealTitles[mealType]}</span>
          <div className="meal-header-actions">
            {!isMealOut(day.id, mealType) && (
              <button 
                className="meal-add-btn-header"
                onClick={() => {
                  setSelectingRecipeFor({ day: day.id, meal: mealType });
                  setRecipeSearchTerm('');
                  setSearchMode(recipes.length > 0 ? 'local' : 'online');
                }}
                title="Aggiungi ricetta"
              >
                +
              </button>
            )}
            {!isMealOut(day.id, mealType) && (
              <button 
                className={`meal-out-btn ${isMealOut(day.id, mealType) ? 'active' : ''}`}
                onClick={() => toggleMealOut(day.id, mealType)}
                title={isMealOut(day.id, mealType) ? 'Torna a cucinare' : 'Mangiamo fuori'}
              >
                <i className={isMealOut(day.id, mealType) ? 'bi bi-house-fill' : 'bi bi-shop'}></i>
              </button>
            )}
            {isMealOut(day.id, mealType) && (
              <button 
                className="meal-out-btn active"
                onClick={() => toggleMealOut(day.id, mealType)}
                title="Torna a cucinare"
              >
                <i className="bi bi-house-fill"></i>
              </button>
            )}
          </div>
        </div>
        
        {isMealOut(day.id, mealType) ? (
          <div className="meal-out-message">
            <i className="bi bi-shop"></i>
            <span>Mangiamo fuori</span>
          </div>
        ) : (
          <div 
            className="meal-recipes"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day.id, mealType)}
          >
                {mealRecipes.length === 0 ? (
                  <div 
                    className="empty-meal"
                    onClick={() => {
                      setSelectingRecipeFor({ day: day.id, meal: mealType });
                      setRecipeSearchTerm('');
                      setSearchMode(recipes.length > 0 ? 'local' : 'online');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    + Aggiungi o trascina qui
                  </div>
                ) : (
                  <>
                    {mealRecipes.map(({ assignment, recipe }) => (
                      <div
                        key={assignment.id}
                        className="recipe-card-mini"
                        draggable
                        onDragStart={(e) => handleAssignmentDragStart(e, assignment.id)}
                        onDragEnd={handleDragEnd}
                        onMouseDown={handleCardMouseDown}
                        onClick={(e) => handleCardClick(recipe, e)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="recipe-card-mini-image">
                          {recipe.image ? (
                            <>
                              <img src={recipe.image} alt={recipe.name} />
                              <div className="recipe-card-image-overlay"></div>
                              <span className="recipe-card-title-overlay">{recipe.name}</span>
                            </>
                          ) : (
                            <span className="recipe-card-title-overlay">{recipe.name}</span>
                          )}
                        </div>
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
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAssignmentServings(assignment.id);
                                  if (e.key === 'Escape') cancelEditingAssignmentServings();
                                }}
                              />
                              <button onClick={() => saveAssignmentServings(assignment.id)} className="servings-btn-save" title="Salva"><i className="bi bi-check"></i></button>
                              <button onClick={cancelEditingAssignmentServings} className="servings-btn-cancel" title="Annulla"><i className="bi bi-x"></i></button>
                            </div>
                          ) : null}
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
      </div>
    );
  };

  return (
    <div className="weekly-planner">
      <div className="planner-header">
        <h2><i className="bi bi-calendar-week"></i> Piano Settimanale</h2>
        <button 
          className="btn btn-outline clear-week-btn"
          onClick={() => {
            if (window.confirm('Vuoi davvero svuotare tutta la settimana? Questa azione non può essere annullata.')) {
              onClearWeek();
            }
          }}
          title="Svuota settimana"
        >
          <i className="bi bi-trash3"></i>
          <span className="clear-week-text">Svuota settimana</span>
        </button>
      </div>

      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
        Clicca su un giorno per assegnare ricette. Usa l'icona fuori a pranzo/cena per saltare un pasto.
      </p>

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

      {/* Week grid - Row-based layout for desktop */}
      <div className="week-grid-rows desktop-view">
        {/* Day headers row */}
        <div className="week-row week-row-headers">
          {DAYS.map(day => (
            <div key={day.id} className="day-header-cell">
              <div className="day-name">{day.name}</div>
            </div>
          ))}
        </div>

        {/* Breakfast row */}
        {enableBreakfast && (
          <div className="week-row">
            {DAYS.map(day => renderMealCell(day, 'breakfast'))}
          </div>
        )}

        {/* Lunch row */}
        {enableLunch && (
          <div className="week-row">
            {DAYS.map(day => renderMealCell(day, 'lunch'))}
          </div>
        )}

        {/* Dinner row */}
        {enableDinner && (
          <div className="week-row">
            {DAYS.map(day => renderMealCell(day, 'dinner'))}
          </div>
        )}
      </div>

      {/* Mobile column view - collapsible days */}
      <div className="week-mobile-view">
        {DAYS.map(day => (
          <div
            key={day.id}
            id={`day-${day.id}`}
            className={`day-column-mobile ${expandedDay !== day.id ? 'collapsed' : ''}`}
          >
            <div 
              className="day-header-mobile"
              onClick={() => toggleDay(day.id)}
            >
              <div className="day-name">{day.name}</div>
              <button className="day-toggle-btn" type="button">
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

      {/* Recipe Selector Modal */}
      {selectingRecipeFor && (
        <div className="recipe-modal-backdrop" onClick={closeModal}>
          <div className="recipe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="recipe-modal-header">
              <h3>
                Aggiungi ricetta - {DAYS[selectingRecipeFor.day].name} {' '}
                {selectingRecipeFor.meal === 'breakfast' ? 'Colazione' : selectingRecipeFor.meal === 'lunch' ? 'Pranzo' : 'Cena'}
              </h3>
              <button className="recipe-modal-close" onClick={closeModal}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            
            <div className="recipe-modal-content">
              <div className="recipe-selector-tabs">
                <button
                  type="button"
                  className={`recipe-selector-tab ${searchMode === 'local' ? 'active' : ''}`}
                  onClick={() => setSearchMode('local')}
                >
                  <i className="bi bi-book"></i> Le tue ricette
                </button>
                <button
                  type="button"
                  className={`recipe-selector-tab ${searchMode === 'online' ? 'active' : ''}`}
                  onClick={() => setSearchMode('online')}
                >
                  <i className="bi bi-search"></i> Cerca online
                </button>
              </div>

              {searchMode === 'online' ? (
                <div className="recipe-selector-section">
                  <OnlineRecipeSearch
                    searchTerm={recipeSearchTerm}
                    onSearchTermChange={setRecipeSearchTerm}
                    onSelectRecipe={handleSelectSearchResult}
                    placeholder="Cerca ricette online..."
                    className="recipe-selector-online-search"
                  />
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Filtra le tue ricette..."
                    value={recipeSearchTerm}
                    onChange={(e) => setRecipeSearchTerm(e.target.value)}
                    className="recipe-search-input"
                  />
                  
                  {recipes.length > 0 ? (
                    <div className="recipe-selector-section">
                      <div className="recipe-selector-list">
                        {recipes
                          .filter(recipe => 
                            !recipeSearchTerm || (recipe.name && recipe.name.toLowerCase().includes(recipeSearchTerm.toLowerCase()))
                          )
                          .map(recipe => (
                            <button
                              key={recipe.id}
                              className="recipe-selector-item-card"
                              onClick={() => {
                                onAddAssignment(recipe.id, selectingRecipeFor.day, selectingRecipeFor.meal);
                                closeModal();
                              }}
                            >
                              {recipe.image ? (
                                <>
                                  <img src={recipe.image} alt={recipe.name} className="recipe-selector-card-image" />
                                  <div className="recipe-selector-card-overlay"></div>
                                  <span className="recipe-selector-card-title">{recipe.name}</span>
                                </>
                              ) : (
                                <>
                                  <div className="recipe-selector-card-placeholder"></div>
                                  <span className="recipe-selector-card-title">{recipe.name}</span>
                                </>
                              )}
                            </button>
                          ))}
                        {recipes.filter(recipe => 
                          !recipeSearchTerm || (recipe.name && recipe.name.toLowerCase().includes(recipeSearchTerm.toLowerCase()))
                        ).length === 0 && recipeSearchTerm && (
                          <div className="recipe-selector-empty">
                            <p style={{ color: 'var(--text-secondary)' }}>
                              Nessuna ricetta trovata per &quot;{recipeSearchTerm}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="recipe-selector-empty">
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <i className="bi bi-info-circle"></i> Non hai ancora ricette
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
