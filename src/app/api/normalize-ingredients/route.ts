import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const prompt = `Sei un assistente esperto per la spesa. Il tuo compito è NORMALIZZARE ingredienti simili e SOMMARE le quantità.

Ingredienti da analizzare:
${ingredients.map((ing: string, i: number) => `${i + 1}. ${ing}`).join('\n')}

REGOLE DI NORMALIZZAZIONE (molto importante per la spesa):
1. Raggruppa varianti dello stesso ingrediente base:
   - "Pomodori rossi", "Pomodorini", "Pomodori pelati", "Pomodori ciliegino" → "Pomodori"
   - "Olio extravergine d'oliva", "Olio d'oliva", "Olio EVO" → "Olio d'oliva"
   - "Sale fino", "Sale grosso" → "Sale"
   - "Aglio 1 spicchio", "Aglio 2 spicchi" → "Aglio"
   
2. Mantieni separati ingredienti REALMENTE diversi:
   - "Petto di pollo" ≠ "Cosce di pollo" (tagli diversi)
   - "Yogurt greco" ≠ "Yogurt magro" (prodotti diversi)
   
3. Somma le quantità per ingredienti normalizzati:
   - Converti unità se necessario (1 kg + 500 g → 1500 g o 1.5 kg)
   - "q.b." (quanto basta) rimane "q.b." e non si somma
   - Se ci sono numeri E "q.b.", mostra "XXX g + q.b."

Rispondi SOLO con un JSON array dove ogni elemento ha:
{
  "normalizedName": "nome normalizzato per la spesa",
  "totalQuantity": "quantità totale calcolata",
  "count": numero di volte che appare
}

Esempio:
Input: ["Pomodori rossi 200 g", "Pomodorini ciliegino 150 g", "Sale fino q.b.", "Sale grosso q.b.", "Olio EVO 30 g", "Olio extravergine d'oliva q.b."]
Output: [
  {"normalizedName": "Pomodori", "totalQuantity": "350 g", "count": 2},
  {"normalizedName": "Sale", "totalQuantity": "q.b.", "count": 2},
  {"normalizedName": "Olio d'oliva", "totalQuantity": "30 g + q.b.", "count": 2}
]

Rispondi solo con il JSON array, nient'altro.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sei un assistente culinario che normalizza ingredienti e calcola totali. Rispondi solo con JSON valido, niente altro testo.'
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
  } catch (error: any) {
    console.error('Error normalizing ingredients:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante la normalizzazione' },
      { status: 500 }
    );
  }
}
