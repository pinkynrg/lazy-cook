'use client';

import { useState } from 'react';
import type { Recipe, JsonLdRecipe } from '@/types/recipe';
import { createSyntheticJsonLd, parseInstructions } from '@/lib/recipeParser';

interface RecipeFormProps {
  onAddRecipe: (recipe: Recipe) => void;
}

export default function RecipeForm({ onAddRecipe }: RecipeFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  
  // Manual form fields
  const [manualName, setManualName] = useState('');
  const [manualIngredients, setManualIngredients] = useState('');
  const [manualServings, setManualServings] = useState('');
  const [manualPrepTime, setManualPrepTime] = useState('');
  const [manualImage, setManualImage] = useState('');
  const [manualInstructions, setManualInstructions] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Handle manual mode
    if (manualMode) {
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
            errorMessage += `\n\n💡 ${errorData.hint}`;
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
          className={`mode-btn ${!manualMode ? 'active' : ''}`}
          onClick={() => setManualMode(false)}
        >
          🔗 URL
        </button>
        <button
          type="button"
          className={`mode-btn ${manualMode ? 'active' : ''}`}
          onClick={() => setManualMode(true)}
        >
          ✍️ Manuale
        </button>
      </div>

      {manualMode ? (
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
            {loading ? '⏳' : '+'}
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
