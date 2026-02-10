import { NextRequest, NextResponse } from 'next/server';

interface GiallozafferanoSuggestion {
  url: string;
  term: string;
}

interface RecipeResult {
  url: string;
  name: string;
  image?: string;
}

// Fetch search results page and extract ALL recipe URLs from gz-title elements
async function getAllRecipeUrls(searchPageUrl: string): Promise<{ url: string; name: string }[]> {
  console.log(`[getAllRecipeUrls] Fetching search page: ${searchPageUrl}`);
  try {
    const response = await fetch(searchPageUrl, {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      },
    });

    if (!response.ok) {
      console.log(`[getAllRecipeUrls] Failed to fetch: ${response.status}`);
      return [];
    }

    const html = await response.text();
    
    // Extract all recipe URLs and titles from gz-title anchors
    // Pattern: <h2 class="gz-title"><a href="URL" title="Name">
    const regex = /<h2\s+class="gz-title">\s*<a\s+href="([^"]+)"\s+title="([^"]+)"/g;
    const recipes: { url: string; name: string }[] = [];
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      recipes.push({
        url: match[1],
        name: match[2],
      });
    }
    
    console.log(`[getAllRecipeUrls] Found ${recipes.length} recipes on page`);
    return recipes;
  } catch (error) {
    console.error(`[getAllRecipeUrls] Error:`, error);
    return [];
  }
}

// Extract image from actual recipe page using Schema.org JSON-LD
async function extractImageFromRecipe(url: string): Promise<string | undefined> {
  console.log(`[extractImageFromRecipe] Fetching: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      },
    });

    if (!response.ok) {
      console.log(`[extractImageFromRecipe] Failed: ${response.status}`);
      return undefined;
    }

    const html = await response.text();
    
    // Extract JSON-LD from the page
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    
    if (!jsonLdMatch) {
      console.log(`[extractImageFromRecipe] No JSON-LD found`);
      return undefined;
    }

    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonContent);
        
        // Handle both single object and array of objects
        const items = Array.isArray(data) ? data : [data];
        
        for (const item of items) {
          const itemType = item['@type'];
          
          if (itemType === 'Recipe' || (Array.isArray(itemType) && itemType.includes('Recipe'))) {
            if (item.image) {
              // Handle different image formats
              if (typeof item.image === 'string') {
                return item.image;
              } else if (Array.isArray(item.image) && item.image.length > 0) {
                const firstImage = item.image[0];
                return typeof firstImage === 'string' ? firstImage : firstImage.url;
              } else if (item.image.url) {
                return item.image.url;
              }
            }
          }
        }
      } catch {
        // Continue to next JSON-LD block
      }
    }

    return undefined;
  } catch (error) {
    console.error(`[extractImageFromRecipe] Error:`, error);
    return undefined;
  }
}

// Get all recipes with images from a search page
async function getRecipesFromSearchPage(searchPageUrl: string): Promise<RecipeResult[]> {
  const recipes = await getAllRecipeUrls(searchPageUrl);
  
  if (recipes.length === 0) {
    return [];
  }
  
  // Fetch images for all recipes in parallel
  const results = await Promise.all(
    recipes.map(async (recipe) => {
      const image = await extractImageFromRecipe(recipe.url);
      return {
        url: recipe.url,
        name: recipe.name,
        image,
      };
    })
  );
  
  return results;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const response = await fetch(
      `https://www.giallozafferano.it/ajax/suggest.php?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9,it;q=0.8',
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'referer': 'https://www.giallozafferano.it/',
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }

    const data: GiallozafferanoSuggestion[] = await response.json();
    
    console.log(`[search-recipes] Got ${data.length} suggestions from Giallozafferano`);
    console.log(`[search-recipes] Search page URLs:`, data.map(d => d.url));
    
    // For each suggestion, fetch the search page and extract ALL recipes
    const allRecipesNested = await Promise.all(
      data.map(async (item, index) => {
        console.log(`[search-recipes] Processing search page ${index}: ${item.url}`);
        const recipes = await getRecipesFromSearchPage(item.url);
        console.log(`[search-recipes] Search page ${index} returned ${recipes.length} recipes`);
        return recipes;
      })
    );

    // Flatten all recipes into a single array
    const allRecipes = allRecipesNested.flat();
    
    // Remove duplicates by URL
    const uniqueRecipes = allRecipes.filter((recipe, index, self) => 
      index === self.findIndex(r => r.url === recipe.url)
    );

    console.log(`[search-recipes] Final results: ${uniqueRecipes.length} unique recipes from ${data.length} search pages`);
    
    // Return in the format expected by frontend
    const results = uniqueRecipes.map(r => ({
      url: r.url,
      term: r.name,
      image: r.image,
    }));
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching recipe suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
