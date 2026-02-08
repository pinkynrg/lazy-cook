import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json();
    
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Lista ingredienti richiesta' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key non configurata nel backend' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Sei un assistente esperto per la spesa. Il tuo compito è NORMALIZZARE ingredienti simili e SOMMARE le quantità.

Ingredienti da analizzare:
${ingredients.map((ing: string, i: number) => `${i + 1}. ${ing}`).join('\n')}

  REGOLE DI NORMALIZZAZIONE (molto importante per la spesa):
1. Raggruppa varianti dello stesso ingrediente base:
   - "Pomodori rossi", "Pomodorini", "Pomodori pelati", "Pomodori ciliegino" → "Pomodori"
   - "Olio extravergine d'oliva", "Olio d'oliva", "Olio EVO" → "Olio d'oliva"
   - "Sale fino", "Sale grosso" → "Sale"
   - "Aglio 1 spicchio", "Aglio 2 spicchi" → "Aglio"
    - SINGOLARE/PLURALE: "uovo" e "uova" → "Uova" (UNA SOLA RIGA)
    - SINGOLARE/PLURALE: "pomodoro" e "pomodori" → "Pomodori" (UNA SOLA RIGA)
    - In generale, preferisci il nome più naturale per la spesa (spesso il plurale): es. "Uova", "Pomodori", "Zucchine".
   
2. Mantieni separati ingredienti REALMENTE diversi:
   - "Petto di pollo" ≠ "Cosce di pollo" (tagli diversi)
   - "Yogurt greco" ≠ "Yogurt magro" (prodotti diversi)
   
3. UNICITÀ: ogni normalizedName deve comparire UNA sola volta nell'output.
  - Se stai per emettere due righe con lo stesso normalizedName, DEVI fonderle.
  - Usa nomi coerenti (maiuscole/minuscole, singolare/plurale) e standard da lista della spesa.
  - Se hai due nomi molto simili che differiscono solo per singolare/plurale (es. "Uovo"/"Uova"), DEVI scegliere un solo nome canonico e fonderli.

4. Somma le quantità per ingredienti normalizzati, ma NON fare assunzioni sbagliate:
  - Converti SOLO tra unità compatibili di peso/volume (kg↔g, l↔ml, ecc.).
  - NON convertire "pezzi"/"uova"/"spicchi" in grammi e viceversa.
  - Se per lo stesso ingrediente hai unità diverse NON convertibili, mantienile separate nel totale usando "+".
    Esempio: "132.5 g + 7.5 uova".
  - "q.b." (quanto basta) rimane "q.b." e non si somma.
  - Se ci sono numeri E "q.b.", mostra "<totale> + q.b.".

   - IMPORTANTE: non lasciare mai un totale senza unità se puoi evitarlo.
     Esempio sbagliato: "5 + 2.5".
     Esempio corretto: "8 uova" oppure "7.5 uova".

5. Ingredienti contabili (count-based): se vedi quantità senza unità (es. "4 uova") considera l'unità implicita.
  - Esempi: "uova" → "uova", "limoni" → "pz", "spicchi" → "spicchi".
  - Se l'unità non è chiara, lascia la quantità come numero senza unità.

6. ARROTONDAMENTI PER LA SPESA:
  - Per ingredienti contabili (uova, pz, spicchi, bustine, ecc.) arrotonda SEMPRE per eccesso all'intero (ceiling).
    Esempio: 7.5 uova → "8 uova".

7. REGOLA SPECIALE UOVA (per normalizzare meglio):
  - "uovo" e "uova" devono diventare SEMPRE "Uova".
  - Se trovi quantità di Uova in grammi (es. "85 g uova"), puoi convertirle in numero di uova assumendo 1 uovo ≈ 60 g,
    poi sommare con le altre uova e arrotondare per eccesso.
    Esempio: 127.5 g uova ≈ 2.125 uova → 3 uova (prima dell'arrotondamento finale).

FORMATO RISPOSTA (obbligatorio):
Rispondi SOLO con un oggetto JSON con una singola proprietà "normalized".
{"normalized": [ ... ]}

Ogni elemento dell'array deve avere:
{
  "normalizedName": "nome normalizzato per la spesa",
  "totalQuantity": "quantità totale calcolata (può contenere ' + ' per unità diverse)",
  "count": numero di occorrenze input raggruppate
}

Esempio:
Input: ["Pomodori rossi 200 g", "Pomodorini ciliegino 150 g", "Sale fino q.b.", "Sale grosso q.b.", "Olio EVO 30 g", "Olio extravergine d'oliva q.b.", "Uova 2", "3 uova"]
Output: {
  "normalized": [
    {"normalizedName": "Pomodori", "totalQuantity": "350 g", "count": 2},
    {"normalizedName": "Sale", "totalQuantity": "q.b.", "count": 2},
    {"normalizedName": "Olio d'oliva", "totalQuantity": "30 g + q.b.", "count": 2},
    {"normalizedName": "Uova", "totalQuantity": "5 uova", "count": 2}
  ]
}

Rispondi solo con l'oggetto JSON, nient'altro.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sei un assistente per la lista della spesa. Devi normalizzare ingredienti, sommare quantità in modo conservativo (senza conversioni improprie) e rispondere solo con JSON valido nel formato richiesto.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Nessuna risposta dall\'API');
    }

    console.log('=== OPENAI RAW RESPONSE ===');
    console.log(responseText);
    console.log('=========================');

    // Parse the response - it might be wrapped in an object
    let normalized;
    try {
      const parsed = JSON.parse(responseText);
      console.log('=== PARSED JSON ===');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('==================');
      
      // If it's an object with an array property, extract it
      if (parsed.ingredients) {
        normalized = parsed.ingredients;
      } else if (parsed.normalized) {
        normalized = parsed.normalized;
      } else if (Array.isArray(parsed)) {
        normalized = parsed;
      } else {
        // Take the first array value found
        const firstArray = Object.values(parsed).find(v => Array.isArray(v));
        normalized = firstArray || [];
      }
      
      console.log('=== EXTRACTED NORMALIZED ARRAY ===');
      console.log(JSON.stringify(normalized, null, 2));
      console.log('==================================');
    } catch (e) {
      console.error('=== PARSE ERROR ===');
      console.error(e);
      console.error('==================');
      throw new Error('Formato risposta non valido');
    }

    return NextResponse.json({ normalized });
  } catch (error: unknown) {
    console.error('Error normalizing ingredients:', error);
    const message = error instanceof Error ? error.message : 'Errore durante la normalizzazione';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
