import { Recipe, RecipeDayAssignment } from '@/types/recipe';

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  fat: number;
  saturatedFat: number;
  fiber: number;
  sodium: number;
  hasData: boolean;
}

export interface MealNutrition {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipeName: string;
  recipeId: number;
  nutrition: DailyNutrition;
}

export const DAILY_TARGETS = {
  calories: 2000,
  protein: 75,
  carbs: 300,
  sugar: 50,
  fat: 70,
  saturatedFat: 20,
  fiber: 30,
  sodium: 2300,
};

/**
 * Parse nutrition value from string (e.g., "413.3 kcal" -> 413.3)
 */
function parseNutritionValue(value?: string): number {
  if (!value) return 0;
  const match = value.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Extract nutrition from recipe JSON-LD
 * Note: Schema.org nutrition data is per serving (per person)
 * plannedServings indicates how many people are eating, but we want per-person values
 */
function extractNutrition(recipe: Recipe, plannedServings: number): DailyNutrition {
  const nutrition = recipe.jsonldSource?.nutrition;
  
  if (!nutrition) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      sugar: 0,
      fat: 0,
      saturatedFat: 0,
      fiber: 0,
      sodium: 0,
      hasData: false,
    };
  }

  // Schema.org nutrition is per serving (per person), so just use those values directly
  return {
    calories: parseNutritionValue(nutrition.calories),
    protein: parseNutritionValue(nutrition.proteinContent),
    carbs: parseNutritionValue(nutrition.carbohydrateContent),
    sugar: parseNutritionValue(nutrition.sugarContent),
    fat: parseNutritionValue(nutrition.fatContent),
    saturatedFat: parseNutritionValue(nutrition.saturatedFatContent),
    fiber: parseNutritionValue(nutrition.fiberContent),
    sodium: parseNutritionValue(nutrition.sodiumContent),
    hasData: true,
  };
}

/**
 * Calculate nutrition for all meals in a day
 */
export function calculateDailyNutrition(
  recipes: Recipe[],
  assignments: RecipeDayAssignment[],
  dayOfWeek: number
): { total: DailyNutrition; meals: MealNutrition[]; hasEatingOut: boolean } {
  const dayAssignments = assignments.filter(a => a.dayOfWeek === dayOfWeek);
  
  // Check if any meal is eating out
  const hasEatingOut = dayAssignments.some(a => a.eatingOut === 1);
  
  const total: DailyNutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    sugar: 0,
    fat: 0,
    saturatedFat: 0,
    fiber: 0,
    sodium: 0,
    hasData: false,
  };

  const meals: MealNutrition[] = [];

  for (const assignment of dayAssignments) {
    // Skip meals marked as eating out
    if (assignment.eatingOut === 1) continue;

    const recipe = recipes.find(r => r.id === assignment.recipeId);
    if (!recipe) continue;

    const mealNutrition = extractNutrition(recipe, assignment.plannedServings);
    
    // Always add meal to the list, even if it doesn't have nutrition data
    meals.push({
      mealType: assignment.mealType,
      recipeName: recipe.name || 'Unknown Recipe',
      recipeId: recipe.id,
      nutrition: mealNutrition,
    });

    // Only add to total if meal has nutrition data
    if (mealNutrition.hasData) {
      total.hasData = true;
      total.calories += mealNutrition.calories;
      total.protein += mealNutrition.protein;
      total.carbs += mealNutrition.carbs;
      total.sugar += mealNutrition.sugar;
      total.fat += mealNutrition.fat;
      total.saturatedFat += mealNutrition.saturatedFat;
      total.fiber += mealNutrition.fiber;
      total.sodium += mealNutrition.sodium;
    }
  }

  return { total, meals, hasEatingOut };
}

/**
 * Calculate percentage of daily target met
 */
export function calculatePercentage(value: number, target: number): number {
  return Math.round((value / target) * 100);
}

/**
 * Get status color based on percentage
 */
export function getNutritionStatus(percentage: number): 'excellent' | 'good' | 'low' | 'high' {
  if (percentage >= 90 && percentage <= 110) return 'excellent';
  if (percentage >= 70 && percentage < 90) return 'good';
  if (percentage < 70) return 'low';
  return 'high';
}

/**
 * Format nutrition value with unit
 */
export function formatNutritionValue(value: number, unit: string): string {
  return `${Math.round(value)}${unit}`;
}
