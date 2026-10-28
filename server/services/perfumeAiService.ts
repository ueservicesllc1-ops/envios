import fetch from 'node-fetch';
import { adminDb } from './firebaseAdmin';

export interface PerfumeAiAnalysis {
  name: string;
  brand: string;
  concentration?: string;
  gender: 'Hombre' | 'Mujer' | 'Unisex';
  dupeOf: string;
  dupeBrand: string;
  olfactoryFamily: string;
  notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  mainAccords: string[];
  longevity: string;
  bestOccasion: string;
  salesPitch: string;
}

class PerfumeAiService {
  private cachedApiKey: string | null = null;
  private cacheExpiry: number = 0;

  /**
   * Obtiene la API Key de Gemini:
   * 1. Variable de entorno GEMINI_API_KEY
   * 2. O Firestore: settings/aiSettings -> geminiApiKey
   */
  async getApiKey(): Promise<string> {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) {
      return process.env.GEMINI_API_KEY.trim();
    }

    const now = Date.now();
    if (this.cachedApiKey && now < this.cacheExpiry) {
      return this.cachedApiKey;
    }

    try {
      const snap = await adminDb().collection('settings').doc('aiSettings').get();
      if (snap.exists) {
        const data = snap.data();
        if (data?.geminiApiKey && typeof data.geminiApiKey === 'string') {
          this.cachedApiKey = data.geminiApiKey.trim();
          this.cacheExpiry = now + 5 * 60 * 1000; // Cache 5 min
          return this.cachedApiKey;
        }
      }
    } catch (err) {
      console.warn('Error reading aiSettings from Firestore:', err);
    }

    return '';
  }

  /**
   * Guarda o actualiza la Gemini API Key en Firestore
   */
  async saveApiKey(key: string): Promise<boolean> {
    const cleanKey = key.trim();
    await adminDb().collection('settings').doc('aiSettings').set({
      geminiApiKey: cleanKey,
      updatedAt: new Date()
    }, { merge: true });
    this.cachedApiKey = cleanKey;
    this.cacheExpiry = Date.now() + 5 * 60 * 1000;
    return true;
  }

  /**
   * Analiza una imagen de perfume (frasco/caja) mediante Gemini Vision
   */
  async identifyFromImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<PerfumeAiAnalysis | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('No se ha configurado la API Key de Google Gemini. Configúrala en ajustes.');
    }

    // Limpiar data URL prefix si existe
    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const prompt = `Eres un sommelier y experto enciclopédico en perfumería árabe (Lattafa, Armaf, Afnan, Maison Alhambra, Fragrance World, Al Haramain), comercial (Dior, Chanel, Versace, JPG, Carolina Herrera) y de nicho.
Analiza con total precisión esta fotografía del frasco o caja de perfume.

Identifica:
1. Marca oficial exacta (brand).
2. Nombre del perfume (name).
3. Concentración (concentration: ej. "Eau de Parfum (EDP)", "Extrait de Parfum", etc.).
4. Género al que suele dirigirse (gender: "Hombre" | "Mujer" | "Unisex").
5. De cuál perfume famoso de diseñador o nicho es DUPE / CLON / INSPIRACIÓN (dupeOf y dupeBrand). Ejemplos:
   - Si es Lattafa Asad -> dupeOf: "Dior Sauvage Elixir", dupeBrand: "Dior"
   - Si es Armaf Club de Nuit Intense Man -> dupeOf: "Creed Aventus", dupeBrand: "Creed"
   - Si es Lattafa Khamrah -> dupeOf: "By Kilian Angels' Share", dupeBrand: "Kilian"
   - Si es Afnan 9 PM -> dupeOf: "Jean Paul Gaultier Ultra Male", dupeBrand: "Jean Paul Gaultier"
   - Si es un perfume original (ej. Acqua di Gio, Sauvage) -> dupeOf: "Creación Original", dupeBrand: Marca original.
6. Familia olfativa (olfactoryFamily: ej. "Ámbar Amaderado", "Cítrico Aromático", etc.).
7. Pirámide olfativa completa en español:
   - top: Lista de notas de salida
   - middle: Lista de notas de corazón
   - base: Lista de notas de fondo
8. Acordes principales (mainAccords: lista de 4 a 6 acordes, ej: ["Amaderado", "Dulce", "Ahumado", "Avainillado"]).
9. Longevidad y proyección estimada (longevity: ej: "8 a 10 horas - Proyección alta").
10. Mejor ocasión de uso (bestOccasion: ej: "Noches de fiesta, citas, climas templados o fríos").
11. Argumento de venta rápido para el asesor (salesPitch: 2 oraciones persuasivas que el vendedor pueda recitar al cliente).

Responde EXCLUSIVAMENTE un objeto JSON válido con esta estructura, sin texto antes ni después, ni bloques markdown:
{
  "brand": "...",
  "name": "...",
  "concentration": "...",
  "gender": "Hombre",
  "dupeOf": "...",
  "dupeBrand": "...",
  "olfactoryFamily": "...",
  "notes": {
    "top": ["..."],
    "middle": ["..."],
    "base": ["..."]
  },
  "mainAccords": ["..."],
  "longevity": "...",
  "bestOccasion": "...",
  "salesPitch": "..."
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: 'application/json'
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error Gemini Vision API:', res.status, errText);
      throw new Error(`Error en API de Gemini (${res.status}): ${errText}`);
    }

    const result = await res.json() as any;
    const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('No se recibió respuesta válida del modelo de IA');
    }

    return this.parseJsonResponse(textOutput);
  }

  /**
   * Enriquece un perfume por nombre, marca o código de barras
   */
  async enrichByNameOrBarcode(query: string, brand?: string, barcode?: string): Promise<PerfumeAiAnalysis | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('No se ha configurado la API Key de Google Gemini');
    }

    const prompt = `Eres un sommelier y experto enciclopédico en perfumería árabe (Lattafa, Armaf, Afnan, Maison Alhambra, Fragrance World, etc.), diseñador y nicho.
Proporciona la ficha olfativa técnica y comercial del perfume:
- Nombre o Búsqueda: "${query}"
- Marca sugerida: "${brand || ''}"
- Código de barras UPC/EAN: "${barcode || ''}"

Determina con exactitud:
1. Nombre oficial exacto (name).
2. Marca oficial (brand).
3. Concentración (concentration: ej. "Eau de Parfum (EDP)").
4. Género ("Hombre" | "Mujer" | "Unisex").
5. De cuál perfume famoso es DUPE / CLON / INSPIRACIÓN (dupeOf y dupeBrand). Si es una creación original, pon "Creación Original".
6. Familia olfativa en español (olfactoryFamily).
7. Pirámide olfativa completa en español (notes: top, middle, base).
8. Acordes principales (mainAccords: 4 a 6 etiquetas).
9. Longevidad y proyección (longevity).
10. Mejor ocasión de uso (bestOccasion).
11. Argumento de venta rápido para el asesor (salesPitch).

Responde EXCLUSIVAMENTE con el JSON estructurado:
{
  "brand": "...",
  "name": "...",
  "concentration": "...",
  "gender": "Hombre",
  "dupeOf": "...",
  "dupeBrand": "...",
  "olfactoryFamily": "...",
  "notes": {
    "top": ["..."],
    "middle": ["..."],
    "base": ["..."]
  },
  "mainAccords": ["..."],
  "longevity": "...",
  "bestOccasion": "...",
  "salesPitch": "..."
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: 'application/json'
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error Gemini text API:', res.status, errText);
      throw new Error(`Error en API de Gemini (${res.status}): ${errText}`);
    }

    const result = await res.json() as any;
    const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) return null;

    return this.parseJsonResponse(textOutput);
  }

  private parseJsonResponse(text: string): PerfumeAiAnalysis {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(clean);
    return {
      name: parsed.name || '',
      brand: parsed.brand || '',
      concentration: parsed.concentration || 'Eau de Parfum',
      gender: ['Hombre', 'Mujer', 'Unisex'].includes(parsed.gender) ? parsed.gender : 'Unisex',
      dupeOf: parsed.dupeOf || 'Creación Original',
      dupeBrand: parsed.dupeBrand || parsed.brand || '',
      olfactoryFamily: parsed.olfactoryFamily || 'Aromática',
      notes: {
        top: Array.isArray(parsed.notes?.top) ? parsed.notes.top : [],
        middle: Array.isArray(parsed.notes?.middle) ? parsed.notes.middle : [],
        base: Array.isArray(parsed.notes?.base) ? parsed.notes.base : []
      },
      mainAccords: Array.isArray(parsed.mainAccords) ? parsed.mainAccords : [],
      longevity: parsed.longevity || 'Moderada a Alta',
      bestOccasion: parsed.bestOccasion || 'Uso versátil',
      salesPitch: parsed.salesPitch || ''
    };
  }
}

export const perfumeAiService = new PerfumeAiService();
