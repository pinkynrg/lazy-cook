'use client';

import { useState, useEffect, useRef } from 'react';
import type { Recipe, JsonLdRecipe } from '@/types/recipe';
import { createSyntheticJsonLd, parseInstructions } from '@/lib/recipeParser';

interface SearchSuggestion {
  url: string;
  term: string;
  image?: string;
}

type FormMode = 'url' | 'search' | 'manual';

interface RecipeFormProps {
  onAddRecipe: (recipe: Recipe) => void;
}

export default function RecipeForm({ onAddRecipe }: RecipeFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('search');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Manual form fields
  const [manualName, setManualName] = useState('');
  const [manualIngredients, setManualIngredients] = useState('');
  const [manualServings, setManualServings] = useState('');
  const [manualPrepTime, setManualPrepTime] = useState('');
  const [manualImage, setManualImage] = useState('');
  const [manualInstructions, setManualInstructions] = useState('');

  // Manual search function triggered by button click
  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setError('Inserisci almeno 2 caratteri');
      return;
    }

    setIsSearching(true);
    setError('');
    try {
      const response = await fetch(`/api/search-recipes?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowResults(true);
        if (data.length === 0) {
          setError('Nessuna ricetta trovata');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Errore durante la ricerca');
    } finally {
      setIsSearching(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addRecipeFromJsonLd = (jsonld: JsonLdRecipe) => {
    const recipe: Recipe = {
      id: Date.now(),
      jsonldSource: jsonld,
      dateAdded: new Date().toISOString(),
    };

    onAddRecipe(recipe);
    setUrl('');
    setError('');
  };

  const handleSelectRecipe = async (suggestion: SearchSuggestion) => {
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: suggestion.url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Errore durante l\'estrazione';
        if (errorData.hint) {
          errorMessage += `\n\nSuggerimento: ${errorData.hint}`;
        }
        throw new Error(errorMessage);
      }

      const { recipe } = await response.json();
      if (!recipe.url && !recipe['@id']) {
        recipe.url = suggestion.url;
      }
      addRecipeFromJsonLd(recipe);
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'estrazione della ricetta');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Handle manual mode
    if (formMode === 'manual') {
      if (!manualName.trim()) {
        setError('Il nome della ricetta è obbligatorio');
        return;
      }
      if (!manualIngredients.trim()) {
        setError('Gli ingredienti sono obbligatori');
        return;
      }

      const ingredientList = manualIngredients
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Create synthetic JSON-LD
      const jsonld = createSyntheticJsonLd(
        manualName,
        ingredientList,
        manualServings,
        manualPrepTime,
        manualImage,
        manualInstructions
      );

      const recipe: Recipe = {
        id: Date.now(),
        jsonldSource: jsonld,
        dateAdded: new Date().toISOString(),
      };

      onAddRecipe(recipe);
      
      // Reset form
      setManualName('');
      setManualIngredients('');
      setManualServings('');
      setManualPrepTime('');
      setManualImage('');
      setManualInstructions('');
      setError('');
      return;
    }

    if (!url.trim()) {
      setError('Inserisci un URL');
      return;
    }

    // If it's a URL, extract via API
    if (url.startsWith('http')) {
      setLoading(true);
      try {
        const response = await fetch('/api/extract-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          let errorMessage = errorData.error || 'Errore durante l\'estrazione';
          if (errorData.hint) {
            errorMessage += `\n\nSuggerimento: ${errorData.hint}`;
          }
          throw new Error(errorMessage);
        }

        const { recipe } = await response.json();
        // Ensure URL is stored in the JSON-LD for duplicate detection
        if (!recipe.url && !recipe['@id']) {
          recipe.url = url;
        }
        addRecipeFromJsonLd(recipe);
      } catch (err: any) {
        setError(err.message || 'Errore durante l\'estrazione della ricetta');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Formato non valido. Inserisci un URL che inizia con http:// o https://');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="recipe-form-compact">
      <div className="form-mode-toggle">
        <button
          type="button"
          className={`mode-btn ${formMode === 'search' ? 'active' : ''}`}
          onClick={() => setFormMode('search')}
        >
          <i className="bi bi-search"></i> Cerca
        </button>
        <button
          type="button"
          className={`mode-btn ${formMode === 'url' ? 'active' : ''}`}
          onClick={() => setFormMode('url')}
        >
          <i className="bi bi-link-45deg"></i> URL
        </button>
        <button
          type="button"
          className={`mode-btn ${formMode === 'manual' ? 'active' : ''}`}
          onClick={() => setFormMode('manual')}
        >
          <i className="bi bi-pencil-square"></i> Manuale
        </button>
      </div>

      {formMode === 'manual' ? (
        <div className="manual-form">
          <div className="form-group">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Nome ricetta *"
              className="recipe-input"
              required
            />
          </div>
          
          <div className="form-group">
            <textarea
              value={manualIngredients}
              onChange={(e) => setManualIngredients(e.target.value)}
              placeholder="Ingredienti (uno per riga) *&#10;Esempio:&#10;200 g di pasta&#10;100 g di pancetta&#10;Sale q.b."
              className="recipe-textarea"
              rows={6}
              required
            />
          </div>

          <div className="form-row">
            <input
              type="text"
              value={manualServings}
              onChange={(e) => setManualServings(e.target.value)}
              placeholder="Porzioni (es. 4)"
              className="recipe-input"
            />
            <input
              type="text"
              value={manualPrepTime}
              onChange={(e) => setManualPrepTime(e.target.value)}
              placeholder="Tempo (es. 30 min)"
              className="recipe-input"
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              value={manualImage}
              onChange={(e) => setManualImage(e.target.value)}
              placeholder="URL immagine (opzionale)"
              className="recipe-input"
            />
          </div>

          <div className="form-group">
            <textarea
              value={manualInstructions}
              onChange={(e) => setManualInstructions(e.target.value)}
              placeholder="Preparazione (opzionale)&#10;Descrivi i passaggi per preparare la ricetta..."
              className="recipe-textarea"
              rows={6}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            ➕ Aggiungi Ricetta
          </button>
        </div>
      ) : formMode === 'search' ? (
        <div className="search-form" ref={searchRef}>
          <div className="search-input-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca ricetta..."
              className="recipe-input"
              disabled={loading || isSearching}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            <button
              type="button"
              className="btn btn-primary btn-search"
              onClick={handleSearch}
              disabled={loading || isSearching}
            >
              {isSearching ? <i className="bi bi-hourglass-split"></i> : <i className="bi bi-search"></i>}
            </button>
          </div>
          
          {showResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  className="search-result-item"
                  onClick={() => handleSelectRecipe(result)}
                  disabled={loading}
                >
                  {result.image ? (
                    <img 
                      src={result.image} 
                      alt={result.term}
                      className="search-result-image"
                    />
                  ) : (
                    <div className="search-result-placeholder">
                      <i className="bi bi-journal-text"></i>
                    </div>
                  )}
                  <span className="search-result-term">{result.term}</span>
                </button>
              ))}
            </div>
          )}
          
          {loading && (
            <div className="loading-message">
              <span><i className="bi bi-hourglass-split"></i> Importando ricetta...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="add-recipe-form">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Incolla URL della ricetta"
            className="recipe-input"
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary btn-add" disabled={loading}>
            {loading ? <i className="bi bi-hourglass-split"></i> : '+'}
          </button>
        </div>
      )}
      
      {error && (
        <div className="error-message-compact" style={{ whiteSpace: 'pre-line' }}>
          {error}
        </div>
      )}
    </form>
  );
}
