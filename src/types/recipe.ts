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
  currentPlanName?: string;
  enableFamilyTasks?: boolean;

  // Which meals usually require cooking / dishes.
  // Used to decide which task columns are relevant.
  cookBreakfast?: boolean;
  cookLunch?: boolean;
  cookDinner?: boolean;
  cleanBreakfast?: boolean;
  cleanLunch?: boolean;
  cleanDinner?: boolean;
}

export interface Ingredient {
  original: string;
  quantity: string;
  name: string;
  normalized?: string;
}

export interface GroceryItem {
  id?: number;
  name: string;
  quantities: string[];
  original: string[];
  normalized: boolean;
  totalQuantity?: string; // AI-calculated total
  checked?: boolean;
  sources?: Array<{ // Track which recipes contributed this ingredient
    recipeName: string;
    recipeId: number;
    assignmentId?: number;
    dayOfWeek?: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner';
    quantity: string;
    originalText: string;
  }>;
}

export interface NutritionInformation {
  calories?: string;
  proteinContent?: string;
  carbohydrateContent?: string;
  sugarContent?: string;
  fatContent?: string;
  saturatedFatContent?: string;
  fiberContent?: string;
  cholesterolContent?: string;
  sodiumContent?: string;
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
  nutrition?: NutritionInformation | {
    '@type': 'NutritionInformation';
    calories?: string;
    proteinContent?: string;
    carbohydrateContent?: string;
    sugarContent?: string;
    fatContent?: string;
    saturatedFatContent?: string;
    fiberContent?: string;
    cholesterolContent?: string;
    sodiumContent?: string;
  };
}
