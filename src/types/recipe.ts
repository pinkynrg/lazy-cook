export interface Recipe {
  id: number;
  jsonldSource: JsonLdRecipe; // Original or synthetic JSON-LD
  userOverrides?: RecipeOverrides; // User customizations
  dateAdded: string;
  assignments?: RecipeDayAssignment[]; // Multiple day assignments
  // Computed/cached properties for convenience
  name?: string;
  image?: string | null;
  prepTime?: string | null;
  servings?: string | null;
  ingredients?: Ingredient[];
  instructions?: string | null;
  url?: string | null;
  dayOfWeek?: number | null; // Deprecated
}

export interface RecipeOverrides {
  servings?: string;
  instructions?: string;
}

export interface RecipeDayAssignment {
  id: number;
  recipeId: number;
  dayOfWeek: number; // 0-6 for Mon-Sun
  mealType: 'breakfast' | 'lunch' | 'dinner';
  plannedServings: number; // Number of servings for this specific meal
  eatingOut?: number; // 0 or 1, whether this meal is eaten outside
  createdAt: string;
}

export interface Settings {
  familySize: number;
  enableBreakfast: boolean;
  enableLunch: boolean;
  enableDinner: boolean;
}

export interface Ingredient {
  original: string;
  quantity: string;
  name: string;
}

export interface GroceryItem {
  id?: number;
  name: string;
  quantities: string[];
  original: string[];
  normalized: boolean;
  totalQuantity?: string; // AI-calculated total
  checked?: boolean;
}

export interface JsonLdRecipe {
  '@context': string;
  '@type': string;
  name: string;
  image?: string | string[];
  prepTime?: string;
  totalTime?: string;
  recipeYield?: string | number;
  servings?: string | number;
  recipeIngredient: string[];
  recipeInstructions?: string | string[] | Array<{text?: string; '@type'?: string}>;
  url?: string;
}
