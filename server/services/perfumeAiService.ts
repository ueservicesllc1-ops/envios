import { adminDb } from './firebaseAdmin';

export interface OlfactoryNotes {
  top: string[];
  middle: string[];
  base: string[];
}

export interface PerfumeAiAnalysis {
  name: string;
  brand: string;
  concentration?: string;
  gender?: 'Hombre' | 'Mujer' | 'Unisex';
  dupeOf?: string;
  dupeBrand?: string;
  dupeStatus?: 'EQUIVALENCIA_DOCUMENTADA' | 'SIMILITUD_MENCIONADA' | 'ORIGINAL' | 'SIN_EQUIVALENCIA';
  olfactoryFamily?: string;
  notes: OlfactoryNotes;
  mainAccords: string[];
  longevity?: string;
  bestOccasion?: string;
  salesPitch?: string;
  description?: string;
  confidence?: 'ALTA' | 'MEDIA' | 'DUDOSA';
  sources?: string[];
  needsReview?: boolean;
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
  async setApiKey(apiKey: string): Promise<void> {
    const cleanKey = apiKey.trim();
    await adminDb().collection('settings').doc('aiSettings').set({
      geminiApiKey: cleanKey,
      updatedAt: new Date().toISOString(),
      model: 'gemini-3.5-flash',
      provider: 'google-ai-studio-free'
    }, { merge: true });
    this.cachedApiKey = cleanKey;
    this.cacheExpiry = Date.now() + 5 * 60 * 1000;
  }

  /**
   * Ejecuta llamada a Gemini con rotación y reintento automático contra spikes 503
   */
  private async executeWithFallback(apiKey: string, promptText: string, inlineData?: { mime_type: string; data: string }): Promise<string | null> {
    const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError = '';

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const parts: any[] = [{ text: promptText }];
        if (inlineData) {
          parts.push({ inline_data: inlineData });
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              response_mime_type: 'application/json'
            }
          })
        });

        if (res.ok) {
          const result = await res.json() as any;
          const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          lastError = `Model ${model} returned ${res.status}: ${await res.text()}`;
          console.warn(`[Gemini Fallback] ${lastError}`);
          // Si es 503 (high demand) o 404, prueba con el siguiente modelo inmediatamente
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[Gemini Fallback Error on ${model}]:`, err.message);
      }
    }

    throw new Error(`Error en API de Gemini: ${lastError}`);
  }

  /**
   * Analiza una imagen de perfume (frasco/caja) mediante Gemini Vision
   */
  async identifyFromPhoto(base64Image: string): Promise<PerfumeAiAnalysis | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('No se ha configurado la API Key de Google Gemini. Configúrala en ajustes.');
    }

    const mimeMatch = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const cleanBase64 = base64Image.replace(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/, '');

    const prompt = `Eres un experto mundial y sommelier en perfumería árabe (Lattafa, Armaf, Afnan, Maison Alhambra, Fragrance World, Paris Corner, etc.) y perfumes de diseñador.
Analiza con máxima precisión la imagen del perfume (frasco, caja o tipografía).
Determina:
1. Marca oficial exacta (brand).
2. Nombre comercial exacto (name).
3. Concentración ("Eau de Parfum", "Extrait de Parfum", "Eau de Toilette").
4. Género ("Hombre", "Mujer" o "Unisex").
5. Si es un DUPE / CLON / INSPIRACIÓN de otro perfume famoso, indica de cuál (dupeOf) y de qué diseñador (dupeBrand). Si es creación original, pon "Creación Original".
6. Estado del dupe ("EQUIVALENCIA_DOCUMENTADA", "SIMILITUD_MENCIONADA", "ORIGINAL", "SIN_EQUIVALENCIA").
7. Familia olfativa en español (olfactoryFamily).
8. Pirámide olfativa completa en español (notes: top, middle, base).
9. Acordes principales (mainAccords: lista de 4 a 6 acordes en español).
10. Longevidad estimada y proyección (longevity).
11. Ocasión de uso ideal (bestOccasion).
12. Pitch comercial de venta para el asesor (salesPitch).

Responde ÚNICAMENTE en JSON con la siguiente estructura exacta:
{
  "brand": "...",
  "name": "...",
  "concentration": "...",
  "gender": "Hombre" | "Mujer" | "Unisex",
  "dupeOf": "...",
  "dupeBrand": "...",
  "dupeStatus": "EQUIVALENCIA_DOCUMENTADA",
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

    const textOutput = await this.executeWithFallback(apiKey, prompt, {
      mime_type: mimeType,
      data: cleanBase64
    });

    if (!textOutput) return null;
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

Investiga rigurosamente fuentes especializadas (Fragrantica, Parfumo, Basenotes y casas matrices).
Diferencia claramente:
1. "EQUIVALENCIA_DOCUMENTADA": Si la inspiración o clon de diseñador está confirmado por la marca o por la comunidad especializada.
2. "SIMILITUD_MENCIONADA": Si sólo huele parecido según algunos usuarios.
3. "ORIGINAL": Si la casa lo formuló como creación original sin inspiración en otra fragancia.
4. "SIN_EQUIVALENCIA": Si no hay datos suficientes de clon o equivalencia.

Determina con exactitud:
1. Nombre oficial exacto (name).
2. Marca oficial (brand).
3. Concentración (concentration: ej. "Eau de Parfum (EDP)").
4. Género ("Hombre" | "Mujer" | "Unisex").
5. De cuál perfume famoso es DUPE / CLON / INSPIRACIÓN (dupeOf y dupeBrand). Si es una creación original, pon "Creación Original".
6. Estado de la equivalencia (dupeStatus: "EQUIVALENCIA_DOCUMENTADA" | "SIMILITUD_MENCIONADA" | "ORIGINAL" | "SIN_EQUIVALENCIA").
7. Familia olfativa en español (olfactoryFamily).
8. Pirámide olfativa completa en español (notes: top, middle, base).
9. Acordes principales (mainAccords: 4 a 6 etiquetas).
10. Longevidad y proyección (longevity).
11. Mejor ocasión de uso (bestOccasion).
12. Argumento de venta rápido para el asesor (salesPitch).
13. Descripción atractiva y elegante del perfume en español de 2 oraciones (description).
14. Nivel de confianza ("ALTA" | "MEDIA" | "DUDOSA") y fuentes de referencia ("Fragrantica", "Parfumo", "Sitio Oficial").

Responde EXCLUSIVAMENTE con el JSON estructurado:
{
  "brand": "...",
  "name": "...",
  "concentration": "...",
  "gender": "Hombre",
  "dupeOf": "...",
  "dupeBrand": "...",
  "dupeStatus": "EQUIVALENCIA_DOCUMENTADA",
  "olfactoryFamily": "...",
  "notes": {
    "top": ["..."],
    "middle": ["..."],
    "base": ["..."]
  },
  "mainAccords": ["..."],
  "longevity": "...",
  "bestOccasion": "...",
  "salesPitch": "...",
  "description": "...",
  "confidence": "ALTA",
  "sources": ["Fragrantica", "Parfumo"]
}`;

    const textOutput = await this.executeWithFallback(apiKey, prompt);
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
      dupeStatus: parsed.dupeStatus || (parsed.dupeOf && parsed.dupeOf !== 'Creación Original' ? 'EQUIVALENCIA_DOCUMENTADA' : 'ORIGINAL'),
      olfactoryFamily: parsed.olfactoryFamily || 'Aromática',
      notes: {
        top: Array.isArray(parsed.notes?.top) ? parsed.notes.top : [],
        middle: Array.isArray(parsed.notes?.middle) ? parsed.notes.middle : [],
        base: Array.isArray(parsed.notes?.base) ? parsed.notes.base : []
      },
      mainAccords: Array.isArray(parsed.mainAccords) ? parsed.mainAccords : [],
      longevity: parsed.longevity || 'Moderada a Alta',
      bestOccasion: parsed.bestOccasion || 'Uso versátil',
      salesPitch: parsed.salesPitch || '',
      description: parsed.description || '',
      confidence: parsed.confidence || 'ALTA',
      sources: Array.isArray(parsed.sources) ? parsed.sources : ['Fragrantica', 'Parfumo'],
      needsReview: parsed.confidence === 'DUDOSA' || parsed.dupeStatus === 'SIMILITUD_MENCIONADA'
    };
  }

  /**
   * Investiga un perfume famoso de diseñador/nicho y encuentra sus clones/dupes más reconocidos
   */
  async researchReferenceWithDupes(queryTerm: string): Promise<any | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    const prompt = `Eres un sommelier y experto internacional en perfumería de nicho, diseñador y perfumería árabe de equivalencias.
Investiga la fragancia de referencia solicitada: "${queryTerm}".

Identifica:
1. Nombre exacto de la fragancia original de diseñador/nicho (name) y su casa perfumista (brand).
2. Género ("Hombre" | "Mujer" | "Unisex").
3. Familia olfativa en español (olfactoryFamily).
4. Notas clave (keyNotes: 4 a 6 notas representativas).
5. Acordes principales (mainAccords: 3 a 5 acordes).
6. Descripción breve y seductora en español de 2 oraciones (description).
7. Los mejores 3 a 6 CLONES / DUPES más reconocidos del mercado (de marcas como Armaf, Lattafa, Afnan, Maison Alhambra, Al Haramain, Paris Corner, etc.).
   Para cada dupe indica:
   - name: Nombre comercial del perfume clon (ej: "Club De Nuit Intense Man")
   - brand: Marca árabe o fabricante (ej: "Armaf")
   - similarity: Breve texto de similitud y por qué se parece (ej: "95% similitud - El clon más aclamado con piña ahumada")

Responde EXCLUSIVAMENTE con el JSON estructurado:
{
  "name": "...",
  "brand": "...",
  "gender": "Hombre",
  "olfactoryFamily": "...",
  "keyNotes": ["...", "..."],
  "mainAccords": ["...", "..."],
  "description": "...",
  "knownDupes": [
    {
      "name": "...",
      "brand": "...",
      "similarity": "..."
    }
  ]
}`;

    const textOutput = await this.executeWithFallback(apiKey, prompt);
    if (!textOutput) return null;

    try {
      let clean = textOutput.trim();
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(clean);
    } catch (e) {
      console.error('Error parsing researchReferenceWithDupes JSON:', e);
      return null;
    }
  }
}

export const perfumeAiService = new PerfumeAiService();
