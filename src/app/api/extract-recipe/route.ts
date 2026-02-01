import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL è richiesto' },
        { status: 400 }
      );
    }

    // Fetch the recipe page with more realistic browser headers
    const urlObj = new URL(url);
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      
      if (response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Sito protetto - copia manualmente il JSON-LD',
            hint: 'Apri la pagina nel browser, clicca con il tasto destro > Ispeziona > cerca "application/ld+json" e copia il contenuto del tag <script type="application/ld+json"> (solo il JSON, senza i tag script)'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Impossibile recuperare la ricetta' },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Debug: log how many script tags we find
    const scriptTags = $('script[type="application/ld+json"]');
    console.log(`Found ${scriptTags.length} JSON-LD script tags for URL: ${url}`);

    // Find JSON-LD script tag
    let jsonld = null;
    let parseErrors = [];
    
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        let content = $(element).html();
        if (content) {
          // Clean up content - remove control characters that can break JSON parsing
          content = content
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .trim();
          
          const parsed = JSON.parse(content);
          // Look for Recipe type
          if (parsed['@type'] === 'Recipe') {
            jsonld = parsed;
            return false; // Stop iteration
          } else if (Array.isArray(parsed)) {
            // Sometimes it's an array of items
            const recipe = parsed.find(item => item && item['@type'] === 'Recipe');
            if (recipe) {
              jsonld = recipe;
              return false; // Stop iteration
            }
          } else if (parsed['@graph']) {
            // Sometimes it's in a @graph
            const recipe = parsed['@graph'].find((item: any) => item && item['@type'] === 'Recipe');
            if (recipe) {
              jsonld = recipe;
              return false; // Stop iteration
            }
          }
        }
      } catch (e: any) {
        parseErrors.push(e.message);
        // Continue to next script tag
      }
    });

    if (!jsonld) {
      console.error('No recipe found. Parse errors:', parseErrors);
      console.error('Found script tags:', scriptTags.length);
      
      // Debug: log first 500 chars of each script tag content
      scriptTags.each((i, el) => {
        const content = $(el).html();
        console.log(`Script tag ${i} preview:`, content?.substring(0, 500));
      });
      
      return NextResponse.json(
        { 
          error: 'Nessuna ricetta trovata in formato JSON-LD',
          details: parseErrors.length > 0 ? `Parse errors: ${parseErrors.join(', ')}` : 'No JSON-LD script tags found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ recipe: jsonld });
  } catch (error) {
    console.error('Error extracting recipe:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'estrazione della ricetta' },
      { status: 500 }
    );
  }
}
