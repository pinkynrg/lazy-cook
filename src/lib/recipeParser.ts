import type { Recipe, JsonLdRecipe, Ingredient, RecipeOverrides } from '@/types/recipe';

/**
 * Parse ingredients from JSON-LD format
 */
export function parseIngredients(ingredientList: string[]): Ingredient[] {
  return ingredientList.map(ing => {
    let quantity = '';
    let name = ing;

    // Match quantity at the end (e.g., "Pollo 950 g")
    const endMatch = ing.match(/^(.+?)\s+([\d.,\/]+\s*(?:kg|g|ml|l|cl|dl|cucchiai?|cucchiaini?|pizzichi?|q\.?b\.?|quanto basta))$/i);
    if (endMatch) {
      name = endMatch[1].trim();
      quantity = endMatch[2].trim();
    } else {
      // Match quantity at the beginning (e.g., "950 g di pollo")
      const startMatch = ing.match(/^([\d.,\/]+\s*(?:kg|g|ml|l|cl|dl|cucchiai?|cucchiaini?|pizzichi?))\s+(.+)$/i);
      if (startMatch) {
        quantity = startMatch[1].trim();
        name = startMatch[2].trim();
      } else {
        // Match standalone "q.b." or "quanto basta"
        const qbMatch = ing.match(/^(.+?)\s+(q\.?b\.?|quanto basta)$/i);
        if (qbMatch) {
          name = qbMatch[1].trim();
          quantity = 'q.b.';
        } else {
          // Match count-based quantities without a known unit (e.g., "4 uova", "n. 2 zucchine")
          const countMatch = ing.match(/^(?:n\.?\s*)?([\d.,\/]+)\s+(.+)$/i);
          if (countMatch) {
            quantity = countMatch[1].trim();
            name = countMatch[2].trim();
          }
        }
      }
    }

    return {
      original: ing,
      quantity,
      name,
    };
  });
}

/**
 * Parse instructions from JSON-LD format
 */
export function parseInstructions(recipeInstructions?: string | string[] | Array<{text?: string; '@type'?: string}>): string | null {
  if (!recipeInstructions) return null;
  
  if (typeof recipeInstructions === 'string') {
    return recipeInstructions;
  }
  
  if (Array.isArray(recipeInstructions)) {
    return recipeInstructions
      .map((inst) => {
        if (typeof inst === 'string') return inst;
        if (inst.text) return inst.text;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  
  return null;
}

/**
 * Convert JSON-LD to Recipe object with overrides applied
 */
export function jsonldToRecipe(
  id: number,
  jsonld: JsonLdRecipe,
  overrides?: RecipeOverrides,
  dateAdded?: string
): Recipe {
  const ingredients = parseIngredients(jsonld.recipeIngredient || []);
  const instructions = parseInstructions(jsonld.recipeInstructions);
  
  const parsedImage = Array.isArray(jsonld.image) ? jsonld.image[0] : jsonld.image || null;
  console.log('🔧 Parser - Processing', jsonld.name, '- jsonld.image:', jsonld.image, '- parsed:', parsedImage);
  
  return {
    id,
    jsonldSource: jsonld,
    userOverrides: overrides,
    dateAdded: dateAdded || new Date().toISOString(),
    // Computed properties
    name: jsonld.name || 'Ricetta senza nome',
    image: parsedImage,
    prepTime: jsonld.prepTime || jsonld.totalTime || null,
    servings: overrides?.servings || jsonld.recipeYield?.toString() || jsonld.servings?.toString() || null,
    ingredients,
    instructions: overrides?.instructions || instructions,
    url: jsonld.url || null,
  };
}

/**
 * Create synthetic JSON-LD from manual form data
 */
export function createSyntheticJsonLd(
  name: string,
  ingredients: string[],
  servings?: string,
  prepTime?: string,
  image?: string,
  instructions?: string
): JsonLdRecipe {
  // Create a synthetic URL for manual recipes to enable duplicate detection
  const syntheticUrl = `manual://recipe/${encodeURIComponent(name.toLowerCase())}`;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name,
    url: syntheticUrl, // Add URL for duplicate detection
    recipeIngredient: ingredients,
    ...(servings && { recipeYield: servings }),
    ...(prepTime && { prepTime }),
    ...(image && { image }),
    ...(instructions && { recipeInstructions: instructions }),
  };
}
