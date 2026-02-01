// Recipe Storage
let recipes = [];
let groceryList = [];

// Load data from localStorage on startup
window.addEventListener('DOMContentLoaded', () => {
    loadRecipes();
    renderRecipes();
    updateGroceryList();
});

// Load recipes from localStorage
function loadRecipes() {
    const stored = localStorage.getItem('weekly-recipes');
    if (stored) {
        recipes = JSON.parse(stored);
    }
}

// Save recipes to localStorage
function saveRecipes() {
    localStorage.setItem('weekly-recipes', JSON.stringify(recipes));
}

// Add recipe from URL or JSON-LD
async function addRecipe() {
    const input = document.getElementById('recipe-url');
    const value = input.value.trim();
    
    if (!value) {
        alert('Inserisci un URL o JSON-LD');
        return;
    }
    
    // Check if it's JSON-LD
    if (value.startsWith('{')) {
        try {
            const jsonld = JSON.parse(value);
            if (jsonld['@type'] === 'Recipe') {
                addRecipeFromJsonLd(jsonld);
                input.value = '';
                return;
            }
        } catch (e) {
            alert('JSON non valido. Controlla il formato.');
            return;
        }
    }
    
    // If it's a URL, try to fetch it
    if (value.startsWith('http')) {
        // Note: Direct fetching will fail due to CORS
        // Show modal to manually paste JSON-LD
        showJsonLdModal();
        return;
    }
    
    alert('Formato non riconosciuto. Usa un URL di Giallo Zafferano o incolla il JSON-LD direttamente.');
}

// Show modal for JSON-LD input
function showJsonLdModal() {
    document.getElementById('jsonld-modal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('jsonld-modal').style.display = 'none';
    document.getElementById('jsonld-input').value = '';
}

// Import JSON-LD from modal
function importJsonLd() {
    const jsonldText = document.getElementById('jsonld-input').value.trim();
    
    try {
        const jsonld = JSON.parse(jsonldText);
        if (jsonld['@type'] === 'Recipe') {
            addRecipeFromJsonLd(jsonld);
            closeModal();
            document.getElementById('recipe-url').value = '';
        } else {
            alert('Il JSON non è un tipo Recipe valido');
        }
    } catch (e) {
        alert('Errore nel parsing del JSON: ' + e.message);
    }
}

// Add recipe from JSON-LD object
function addRecipeFromJsonLd(jsonld) {
    if (recipes.length >= 7) {
        alert('Hai già 7 ricette! Rimuovine una prima di aggiungerne altre.');
        return;
    }
    
    const recipe = {
        id: Date.now(),
        name: jsonld.name || 'Ricetta senza nome',
        image: jsonld.image ? (Array.isArray(jsonld.image) ? jsonld.image[0] : jsonld.image) : null,
        prepTime: jsonld.prepTime || jsonld.totalTime || null,
        servings: jsonld.recipeYield || jsonld.servings || null,
        ingredients: parseIngredients(jsonld.recipeIngredient || []),
        url: jsonld.url || null,
        dateAdded: new Date().toISOString()
    };
    
    recipes.push(recipe);
    saveRecipes();
    renderRecipes();
    updateGroceryList();
}

// Parse ingredients from JSON-LD
function parseIngredients(ingredientList) {
    return ingredientList.map(ing => {
        // Try to parse quantity and ingredient name
        // This is a simple parser - can be improved
        const match = ing.match(/^([\d.,\/\s]+)?(.+)$/);
        return {
            original: ing,
            quantity: match && match[1] ? match[1].trim() : '',
            name: match && match[2] ? match[2].trim() : ing,
            normalized: null // Will be filled by AI normalization
        };
    });
}

// Render recipes
function renderRecipes() {
    const container = document.getElementById('recipes-container');
    
    if (recipes.length === 0) {
        container.innerHTML = '<p class="empty-state">Nessuna ricetta aggiunta. Inizia aggiungendo una ricetta!</p>';
        return;
    }
    
    container.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <div class="recipe-header">
                <div>
                    <div class="recipe-title">${recipe.name}</div>
                    <div class="recipe-meta">
                        ${recipe.prepTime ? `<span>⏱️ ${formatDuration(recipe.prepTime)}</span>` : ''}
                        ${recipe.servings ? `<span>👥 ${recipe.servings} porzioni</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="recipe-ingredients">
                <strong>${recipe.ingredients.length} ingredienti</strong>
            </div>
            <div class="recipe-actions">
                <button onclick="viewRecipe(${recipe.id})" class="btn btn-outline btn-small">
                    👁️ Vedi
                </button>
                <button onclick="removeRecipe(${recipe.id})" class="btn btn-danger btn-small">
                    🗑️ Rimuovi
                </button>
            </div>
        </div>
    `).join('');
}

// Format ISO 8601 duration
function formatDuration(duration) {
    if (!duration) return '';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    const hours = match[1] || 0;
    const minutes = match[2] || 0;
    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    if (minutes) return `${minutes}m`;
    return duration;
}

// View recipe details
function viewRecipe(id) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    
    const ingredientsList = recipe.ingredients.map(ing => 
        `  • ${ing.original}`
    ).join('\n');
    
    alert(`${recipe.name}\n\nIngredienti:\n${ingredientsList}\n\n${recipe.url ? 'URL: ' + recipe.url : ''}`);
}

// Remove recipe
function removeRecipe(id) {
    if (!confirm('Sei sicuro di voler rimuovere questa ricetta?')) return;
    
    recipes = recipes.filter(r => r.id !== id);
    saveRecipes();
    renderRecipes();
    updateGroceryList();
}

// Update grocery list
function updateGroceryList() {
    // Aggregate all ingredients
    const ingredientMap = new Map();
    
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            const key = ing.normalized || ing.name.toLowerCase();
            
            if (ingredientMap.has(key)) {
                const existing = ingredientMap.get(key);
                existing.quantities.push(ing.quantity);
                existing.original.push(ing.original);
            } else {
                ingredientMap.set(key, {
                    name: ing.normalized || ing.name,
                    quantities: [ing.quantity],
                    original: [ing.original],
                    normalized: !!ing.normalized
                });
            }
        });
    });
    
    groceryList = Array.from(ingredientMap.values());
    renderGroceryList();
}

// Render grocery list
function renderGroceryList() {
    const container = document.getElementById('grocery-list');
    
    if (groceryList.length === 0) {
        container.innerHTML = '<p class="empty-state">Aggiungi ricette per generare la lista della spesa</p>';
        return;
    }
    
    container.innerHTML = groceryList.map(item => {
        const quantityText = item.quantities.filter(q => q).join(' + ') || 'q.b.';
        return `
            <div class="grocery-item">
                <div>
                    <div class="ingredient-name">
                        ${item.name}
                        ${item.normalized ? '<span class="normalized-badge">AI</span>' : ''}
                    </div>
                    ${item.original.length > 1 ? 
                        `<div class="ingredient-notes">${item.original.length} ricette</div>` : 
                        ''}
                </div>
                <div class="ingredient-quantity">${quantityText}</div>
            </div>
        `;
    }).join('');
}

// Normalize ingredients with AI
async function normalizeIngredients() {
    if (recipes.length === 0) {
        alert('Aggiungi prima delle ricette!');
        return;
    }
    
    // Check if OpenAI API key is configured
    const apiKey = localStorage.getItem('openai-api-key');
    
    if (!apiKey) {
        const key = prompt('Per normalizzare gli ingredienti con AI, inserisci la tua OpenAI API Key:\n\n' +
            'Puoi ottenerla su https://platform.openai.com/api-keys\n\n' +
            'La chiave verrà salvata localmente nel browser.');
        
        if (!key) return;
        localStorage.setItem('openai-api-key', key);
    }
    
    const button = event.target;
    button.disabled = true;
    button.textContent = '⏳ Normalizzazione...';
    
    try {
        await normalizeWithOpenAI();
        button.textContent = '✅ Completato!';
        setTimeout(() => {
            button.textContent = '🤖 Normalizza con AI';
            button.disabled = false;
        }, 2000);
    } catch (error) {
        alert('Errore nella normalizzazione: ' + error.message);
        button.textContent = '🤖 Normalizza con AI';
        button.disabled = false;
    }
}

// Normalize ingredients using OpenAI API
async function normalizeWithOpenAI() {
    const apiKey = localStorage.getItem('openai-api-key');
    
    // Collect all unique ingredients
    const allIngredients = [];
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            allIngredients.push(ing.name);
        });
    });
    
    const prompt = `Sei un assistente culinario. Analizza questa lista di ingredienti e normalizza i nomi, raggruppando quelli che sono lo stesso ingrediente ma scritti diversamente.

Ingredienti:
${allIngredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

Rispondi SOLO con un JSON array dove ogni elemento ha:
- "original": il nome originale
- "normalized": il nome normalizzato (usa la forma più comune in italiano)

Esempio: [{"original": "pomodori rossi", "normalized": "pomodori"}, {"original": "pomidori", "normalized": "pomodori"}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-5.2',
            messages: [
                { role: 'system', content: 'Sei un assistente che normalizza nomi di ingredienti. Rispondi solo con JSON valido.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3
        })
    });
    
    if (!response.ok) {
        throw new Error('Errore API OpenAI: ' + response.statusText);
    }
    
    const data = await response.json();
    const normalized = JSON.parse(data.choices[0].message.content);
    
    // Apply normalization to recipes
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            const match = normalized.find(n => n.original === ing.name);
            if (match && match.normalized !== match.original) {
                ing.normalized = match.normalized;
            }
        });
    });
    
    saveRecipes();
    updateGroceryList();
}

// Copy grocery list to clipboard
function copyGroceryList() {
    const text = groceryList.map(item => {
        const quantityText = item.quantities.filter(q => q).join(' + ') || 'q.b.';
        return `${item.name} - ${quantityText}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Lista copiata negli appunti!');
    }).catch(err => {
        alert('Errore nel copiare: ' + err);
    });
}

// Export grocery list
function exportGroceryList() {
    const text = groceryList.map(item => {
        const quantityText = item.quantities.filter(q => q).join(' + ') || 'q.b.';
        return `${item.name} - ${quantityText}`;
    }).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-spesa-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('jsonld-modal');
    if (event.target === modal) {
        closeModal();
    }
}
