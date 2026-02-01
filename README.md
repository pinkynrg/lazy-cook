# 🍳 Lazy Cook

Una Next.js app per gestire le ricette settimanali e generare automaticamente la lista della spesa.

## ✨ Caratteristiche

- 📋 Gestisci fino a 7 ricette settimanali
- 🛒 Genera automaticamente la lista della spesa aggregando gli ingredienti
- 🤖 Normalizzazione intelligente degli ingredienti con AI (OpenAI GPT-4o-mini)
- 🔗 **Estrai ricette automaticamente dall'URL** - Incolla l'URL di qualsiasi sito di ricette e il backend fa il resto!
- 📱 Interfaccia responsive e intuitiva
- 💾 Salvataggio automatico nel browser (localStorage)
- 📤 Esporta la lista della spesa in formato testo
- 🚀 Backend API con Next.js per evitare CORS

## 🚀 Setup Rapido

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura l'API Key di OpenAI

Crea un file `.env.local` nella root del progetto:

```bash
cp .env.local.example .env.local
```

Modifica `.env.local` e aggiungi la tua chiave API OpenAI:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**Come ottenere l'API Key:**
1. Vai su [platform.openai.com](https://platform.openai.com/)
2. Crea un account o fai login
3. Vai su [API Keys](https://platform.openai.com/api-keys)
4. Crea una nuova chiave API
5. Copiala nel file `.env.local`

### 3. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser!

## 📖 Come Usare

### Aggiungere Ricette

**Modo 1: Incolla URL (CONSIGLIATO ✅)**
1. Vai su un sito di ricette (es: Giallo Zafferano, Cookaround, Sale&Pepe)
2. Cerca una ricetta (es: "carbonara", "tiramisù")
3. Copia l'URL dalla barra degli indirizzi
4. Incolla l'URL nell'app e clicca "+"
5. Il backend estrarrà automaticamente tutti i dati!

**Esempi di URL:**
- `https://www.giallozafferano.it/ricette/Carbonara.html`
- `https://www.cookaround.com/ricetta/carbonara.html`
- `https://www.cucchiaio.it/ricetta/carbonara/`

**Modo 2: Incolla JSON-LD manualmente**
1. Visualizza il sorgente della pagina (`Cmd+Option+U` su Mac)
2. Cerca `<script type="application/ld+json">`
3. Copia il JSON e incollalo nell'app

### Normalizzare gli Ingredienti

Una volta aggiunte le ricette:
1. Clicca su "🤖 Normalizza con AI"
2. L'AI OpenAI analizzerà e raggrupperà ingredienti simili
3. Esempio: "pomodori rossi" + "pomodori pelati" → "pomodori"

### Esportare la Lista

- **📋 Copia Lista**: Copia negli appunti
- **💾 Esporta**: Scarica come file `.txt`

## 🏗️ Architettura

```
lazy-cook/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── extract-recipe/      # Estrae JSON-LD da URL
│   │   │   └── normalize-ingredients/ # Normalizza con AI
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Homepage
│   │   └── globals.css
│   ├── components/
│   │   ├── RecipeForm.tsx            # Form per aggiungere ricette
│   │   ├── RecipeList.tsx            # Lista ricette
│   │   ├── GroceryList.tsx           # Lista della spesa
│   │   └── RecipeModal.tsx           # Modal dettagli ricetta
│   └── types/
│       └── recipe.ts                 # TypeScript types
├── package.json
├── next.config.js
├── tsconfig.json
└── .env.local                        # API keys (non committare!)
```

## 🛠️ Tecnologie

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes
- **Parsing**: Cheerio (estrazione HTML)
- **AI**: OpenAI GPT-4o-mini
- **Styling**: CSS Modules / Global CSS
- **Storage**: LocalStorage (client-side)

## 🔧 API Endpoints

### POST `/api/extract-recipe`
Estrae JSON-LD da URL di ricette.

**Request:**
```json
{
  "url": "https://www.giallozafferano.it/ricette/Carbonara.html"
}
```

**Response:**
```json
{
  "recipe": {
    "@type": "Recipe",
    "name": "Carbonara",
    "recipeIngredient": [...],
    ...
  }
}
```

### POST `/api/normalize-ingredients`
Normalizza lista di ingredienti con AI.

**Request:**
```json
{
  "ingredients": ["pomodori rossi", "pomodori pelati", "sale fino"]
}
```

**Response:**
```json
{
  "normalized": [
    {"original": "pomodori rossi", "normalized": "pomodori"},
    {"original": "pomodori pelati", "normalized": "pomodori"},
    {"original": "sale fino", "normalized": "sale"}
  ]
}
```

## 📝 Comandi

```bash
npm run dev      # Sviluppo (localhost:3000)
npm run build    # Build produzione
npm start        # Avvia produzione
npm run lint     # Linting
```

## 🌟 Funzionalità Future

- [ ] Database (PostgreSQL/MongoDB) per persistenza cloud
- [ ] Autenticazione utenti
- [ ] Condivisione liste con la famiglia
- [ ] App mobile (React Native)
- [ ] Supporto per altri siti (Cookaround, Benedetta)
- [ ] Calcolo calorie e valori nutrizionali
- [ ] Pianificazione calendario settimanale
- [ ] Modalità scura
- [ ] Export PDF con layout professionale

## 📄 Licenza

MIT License - Sentiti libero di usare e modificare questo progetto!
