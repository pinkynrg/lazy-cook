import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface CucchiaioRecipe {
  url: string;
  name: string;
  source: string;
  created_at: string;
  updated_at: string;
}

interface CucchiaioApiResponse {
  scraper: string;
  table: string;
  page: number | null;
  page_size: number;
  total: number;
  count: number;
  search: string;
  search_columns: string[];
  data: CucchiaioRecipe[];
}

interface RecipeResult {
  url: string;
  name: string;
  image?: string;
}

// Extract image from actual recipe page using Schema.org JSON-LD
async function extractImageFromRecipe(url: string): Promise<string | undefined> {
  console.log(`[extractImageFromRecipe] Fetching: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.log(`[extractImageFromRecipe] Failed: ${response.status}`);
      return undefined;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find JSON-LD script tag containing Recipe data
    let recipeImage: string | undefined;
    
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        let content = $(element).html();
        if (!content) return;
        
        // Clean up content - remove control characters that can break JSON parsing
        content = content
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          .trim();
        
        const parsed = JSON.parse(content);
        
        // Handle direct Recipe type
        if (parsed['@type'] === 'Recipe') {
          recipeImage = extractImageFromJsonLd(parsed);
          if (recipeImage) return false; // Stop iteration
        } 
        // Handle array of items
        else if (Array.isArray(parsed)) {
          const recipe = parsed.find(item => item && item['@type'] === 'Recipe');
          if (recipe) {
            recipeImage = extractImageFromJsonLd(recipe);
            if (recipeImage) return false;
          }
        } 
        // Handle @graph structure
        else if (parsed['@graph']) {
          const recipe = parsed['@graph'].find((item: any) => item && item['@type'] === 'Recipe');
          if (recipe) {
            recipeImage = extractImageFromJsonLd(recipe);
            if (recipeImage) return false;
          }
        }
      } catch (e) {
        // Continue to next script tag
      }
    });

    return recipeImage;
  } catch (error) {
    console.error(`[extractImageFromRecipe] Error:`, error);
    return undefined;
  }
}

// Helper function to extract image URL from JSON-LD Recipe object
function extractImageFromJsonLd(recipe: any): string | undefined {
  if (!recipe.image) return undefined;
  
  // Handle different image formats
  if (typeof recipe.image === 'string') {
    return recipe.image;
  } else if (Array.isArray(recipe.image) && recipe.image.length > 0) {
    const firstImage = recipe.image[0];
    return typeof firstImage === 'string' ? firstImage : firstImage.url;
  } else if (recipe.image.url) {
    return recipe.image.url;
  }
  
  return undefined;
}

// Fetch recipes from the Cucchiaio API
async function searchRecipesFromApi(query: string): Promise<CucchiaioRecipe[]> {
  console.log(`[searchRecipesFromApi] Searching for: ${query}`);
  try {
    const response = await fetch(
      `https://crawlers.francescomeli.com/cucchiaio/recipes?page_size=-1&search=${encodeURIComponent(query)}&search_columns=name`,
      {
        headers: {
          'accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`[searchRecipesFromApi] Failed to fetch: ${response.status}`);
      return [];
    }

    const data: CucchiaioApiResponse = await response.json();
    console.log(`[searchRecipesFromApi] Found ${data.count} recipes`);
    
    return data.data || [];
  } catch (error) {
    console.error(`[searchRecipesFromApi] Error:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Fetch recipes from the Cucchiaio API
    const recipes = await searchRecipesFromApi(query);
    
    if (recipes.length === 0) {
      console.log(`[search-recipes] No recipes found for query: ${query}`);
      return NextResponse.json([]);
    }

    console.log(`[search-recipes] Fetching images for ${recipes.length} recipes`);
    
    // Fetch images for all recipes in parallel
    const results = await Promise.all(
      recipes.map(async (recipe) => {
        const image = await extractImageFromRecipe(recipe.url);
        return {
          url: recipe.url,
          term: recipe.name,
          image,
        };
      })
    );

    console.log(`[search-recipes] Final results: ${results.length} recipes`);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching recipe suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
