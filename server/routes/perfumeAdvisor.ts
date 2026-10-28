import express, { Request, Response } from 'express';
import { admin, adminDb } from '../services/firebaseAdmin';
import { perfumeAiService, PerfumeAiAnalysis } from '../services/perfumeAiService';

export const perfumeAdvisorRouter = express.Router();
const db = () => adminDb();

// Helper para calcular stock desglosado
async function getStockForProduct(productId: string) {
  try {
    const snap = await db().collection('inventory').where('productId', '==', productId).get();
    let stockLocal = 0;
    let stockBodegaEc = 0;
    let stockBodegaUsa = 0;

    snap.docs.forEach(d => {
      const data = d.data();
      const loc = (data.location || '').trim().toLowerCase();
      const qty = Number(data.quantity) || 0;

      if (loc.includes('local') || loc.includes('tienda') || loc.includes('mostrador')) {
        stockLocal += qty;
      } else if (loc.includes('usa') || loc.includes('eeuu') || loc.includes('estados unidos')) {
        stockBodegaUsa += qty;
      } else {
        stockBodegaEc += qty;
      }
    });

    return { stockLocal, stockBodegaEc, stockBodegaUsa, totalStock: stockLocal + stockBodegaEc + stockBodegaUsa };
  } catch (err) {
    console.error('Error fetching inventory for product:', productId, err);
    return { stockLocal: 0, stockBodegaEc: 0, stockBodegaUsa: 0, totalStock: 0 };
  }
}

/**
 * GET /api/perfumes/status
 * Verifica el estado del sistema de IA y conteo de perfumes
 */
perfumeAdvisorRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const key = await perfumeAiService.getApiKey();
    const hasKey = !!(key && key.length > 10);

    const productsSnap = await db().collection('products').get();
    let totalPerfumes = 0;
    let enrichedCount = 0;

    productsSnap.docs.forEach(doc => {
      const data = doc.data();
      const cat = (data.category || '').toLowerCase();
      if (cat.includes('perfume')) {
        totalPerfumes++;
        if (data.aiEnriched === true) {
          enrichedCount++;
        }
      }
    });

    res.json({
      success: true,
      hasGeminiKey: hasKey,
      totalPerfumes,
      enrichedCount,
      pendingCount: totalPerfumes - enrichedCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/perfumes/config-key
 * Configura la clave API de Google Gemini en Firestore
 */
perfumeAdvisorRouter.post('/config-key', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Clave API de Gemini inválida' });
    }

    await perfumeAiService.saveApiKey(apiKey);
    res.json({ success: true, message: 'Clave API de Gemini guardada correctamente' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/perfumes/scan-barcode
 * Busca por código de barras. Si ya está enriquecido lo devuelve de inmediato.
 * Si no está enriquecido, consulta a Gemini, lo guarda en Firestore y lo retorna.
 */
perfumeAdvisorRouter.post('/scan-barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.body;
    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ success: false, error: 'Código de barras requerido' });
    }

    const cleanBarcode = barcode.trim();
    const cleanDigits = cleanBarcode.replace(/[^0-9]/g, '');

    // 1. Buscar en products por barcode o sku con todas las variantes (ceros a la izquierda, UPC-A vs EAN-13)
    let productDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    const candidates = Array.from(new Set([
      cleanBarcode,
      cleanBarcode.replace(/^0+/, ''),
      '0' + cleanBarcode.replace(/^0+/, ''),
      cleanDigits
    ])).filter(c => c && c.length > 0);

    for (const c of candidates) {
      if (productDoc) break;
      const s1 = await db().collection('products').where('barcode', '==', c).limit(1).get();
      if (!s1.empty) { productDoc = s1.docs[0]; break; }

      const s2 = await db().collection('products').where('sku', '==', c).limit(1).get();
      if (!s2.empty) { productDoc = s2.docs[0]; break; }
    }

    // Si aún no se encuentra, buscar por coincidencia de dígitos en el catálogo de perfumes
    if (!productDoc && cleanDigits.length >= 6) {
      const allPerfumesSnap = await db().collection('products').get();
      for (const d of allPerfumesSnap.docs) {
        const data = d.data();
        const pSkuDigits = (data.sku || '').replace(/[^0-9]/g, '');
        const pBarcodeDigits = (data.barcode || '').replace(/[^0-9]/g, '');

        if (
          (pSkuDigits.length >= 6 && (pSkuDigits == cleanDigits || pSkuDigits.endsWith(cleanDigits) || cleanDigits.endsWith(pSkuDigits))) ||
          (pBarcodeDigits.length >= 6 && (pBarcodeDigits == cleanDigits || pBarcodeDigits.endsWith(cleanDigits) || cleanDigits.endsWith(pBarcodeDigits)))
        ) {
          productDoc = d;
          break;
        }
      }
    }

    // Si no está en el catálogo, consultar a Gemini para descubrir qué perfume es
    if (!productDoc) {
      try {
        const aiAnalysis = await perfumeAiService.enrichByNameOrBarcode(cleanBarcode, undefined, cleanBarcode);
        return res.json({
          success: true,
          inCatalog: false,
          barcode: cleanBarcode,
          perfume: {
            id: '',
            name: aiAnalysis?.name || `Perfume (${cleanBarcode})`,
            brand: aiAnalysis?.brand || 'Desconocida',
            barcode: cleanBarcode,
            ...aiAnalysis,
            salePrice2: 0,
            stockLocal: 0,
            stockBodegaEc: 0,
            stockBodegaUsa: 0,
            totalStock: 0
          }
        });
      } catch (aiErr: any) {
        return res.status(404).json({
          success: false,
          inCatalog: false,
          error: `Producto no encontrado en inventario (${cleanBarcode})`
        });
      }
    }

    const pData = productDoc.data();
    const stock = await getStockForProduct(productDoc.id);

    // 2. Si ya fue enriquecido con IA, retornar de inmediato
    if (pData.aiEnriched && pData.dupeOf && pData.notes) {
      return res.json({
        success: true,
        inCatalog: true,
        perfume: {
          id: productDoc.id,
          ...pData,
          ...stock,
          price: pData.salePrice2 || pData.pvp || pData.salePrice1 || 0
        }
      });
    }

    // 3. Si no ha sido enriquecido, llamar a Gemini y guardar en Firestore
    let aiData: PerfumeAiAnalysis | null = null;
    try {
      aiData = await perfumeAiService.enrichByNameOrBarcode(pData.name, pData.brand, cleanBarcode);
    } catch (err: any) {
      console.warn('Error enriqueciendo con IA:', err.message);
    }

    const updatePayload: any = {
      aiEnriched: true,
      aiEnrichedAt: new Date().toISOString()
    };

    if (aiData) {
      updatePayload.dupeOf = aiData.dupeOf;
      updatePayload.dupeBrand = aiData.dupeBrand;
      updatePayload.olfactoryFamily = aiData.olfactoryFamily;
      updatePayload.gender = aiData.gender;
      updatePayload.concentration = aiData.concentration;
      updatePayload.notes = aiData.notes;
      updatePayload.mainAccords = aiData.mainAccords;
      updatePayload.longevity = aiData.longevity;
      updatePayload.bestOccasion = aiData.bestOccasion;
      updatePayload.salesPitch = aiData.salesPitch;
      if (!pData.brand && aiData.brand) updatePayload.brand = aiData.brand;
    }

    await db().collection('products').doc(productDoc.id).update(updatePayload);

    return res.json({
      success: true,
      inCatalog: true,
      perfume: {
        id: productDoc.id,
        ...pData,
        ...updatePayload,
        ...stock,
        price: pData.salePrice2 || pData.pvp || pData.salePrice1 || 0
      }
    });

  } catch (err: any) {
    console.error('Error in scan-barcode:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/perfumes/identify-photo
 * Recibe imagen en base64 de la cámara, identifica el perfume y dupe con Gemini Vision
 * y lo cruza con el catálogo de Firestore.
 */
perfumeAdvisorRouter.post('/identify-photo', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Imagen requerida en base64' });
    }

    // 1. Análisis visual con Gemini Vision
    const aiAnalysis = await perfumeAiService.identifyFromImage(imageBase64, mimeType);
    if (!aiAnalysis) {
      return res.status(422).json({ success: false, error: 'No se pudo identificar el perfume en la foto' });
    }

    // 2. Buscar si ya existe en la base de datos por nombre y marca
    const productsSnap = await db().collection('products').get();
    let matchedDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let highestScore = 0;

    const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const detectedNameNorm = normalize(aiAnalysis.name);
    const detectedBrandNorm = normalize(aiAnalysis.brand);

    for (const doc of productsSnap.docs) {
      const data = doc.data();
      const pNameNorm = normalize(data.name);
      const pBrandNorm = normalize(data.brand);

      if (pNameNorm.includes(detectedNameNorm) || detectedNameNorm.includes(pNameNorm)) {
        let score = 2;
        if (pBrandNorm && detectedBrandNorm && (pBrandNorm.includes(detectedBrandNorm) || detectedBrandNorm.includes(pBrandNorm))) {
          score += 3;
        }
        if (score > highestScore) {
          highestScore = score;
          matchedDoc = doc;
        }
      }
    }

    // Si coincide con un producto de la base de datos
    if (matchedDoc) {
      const pData = matchedDoc.data();
      const stock = await getStockForProduct(matchedDoc.id);

      // Guardar o actualizar la ficha enriquecida si faltaba
      const updatePayload: any = {
        aiEnriched: true,
        aiEnrichedAt: new Date().toISOString(),
        dupeOf: aiAnalysis.dupeOf,
        dupeBrand: aiAnalysis.dupeBrand,
        olfactoryFamily: aiAnalysis.olfactoryFamily,
        gender: aiAnalysis.gender,
        concentration: aiAnalysis.concentration,
        notes: aiAnalysis.notes,
        mainAccords: aiAnalysis.mainAccords,
        longevity: aiAnalysis.longevity,
        bestOccasion: aiAnalysis.bestOccasion,
        salesPitch: aiAnalysis.salesPitch
      };

      await db().collection('products').doc(matchedDoc.id).update(updatePayload);

      return res.json({
        success: true,
        inCatalog: true,
        perfume: {
          id: matchedDoc.id,
          ...pData,
          ...updatePayload,
          ...stock,
          price: pData.salePrice2 || pData.pvp || pData.salePrice1 || 0
        }
      });
    }

    // Si no está registrado en el inventario actual
    res.json({
      success: true,
      inCatalog: false,
      perfume: {
        id: '',
        ...aiAnalysis,
        salePrice2: 0,
        stockLocal: 0,
        stockBodegaEc: 0,
        stockBodegaUsa: 0,
        totalStock: 0
      }
    });

  } catch (err: any) {
    console.error('Error in identify-photo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/perfumes/sync-pending
 * Busca todos los perfumes en products que tengan aiEnriched != true y los enriquece
 */
perfumeAdvisorRouter.post('/sync-pending', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.body?.limit) || 10;
    const snap = await db().collection('products').get();

    const pending = snap.docs.filter(doc => {
      const d = doc.data();
      const cat = (d.category || '').toLowerCase();
      return cat.includes('perfume') && d.aiEnriched !== true;
    }).slice(0, limit);

    const enrichedResults: string[] = [];

    for (const doc of pending) {
      const d = doc.data();
      try {
        const aiData = await perfumeAiService.enrichByNameOrBarcode(d.name, d.brand, d.barcode);
        if (aiData) {
          await db().collection('products').doc(doc.id).update({
            aiEnriched: true,
            aiEnrichedAt: new Date().toISOString(),
            dupeOf: aiData.dupeOf,
            dupeBrand: aiData.dupeBrand,
            olfactoryFamily: aiData.olfactoryFamily,
            gender: aiData.gender,
            concentration: aiData.concentration,
            notes: aiData.notes,
            mainAccords: aiData.mainAccords,
            longevity: aiData.longevity,
            bestOccasion: aiData.bestOccasion,
            salesPitch: aiData.salesPitch,
            ...(d.brand ? {} : { brand: aiData.brand })
          });
          enrichedResults.push(`${d.name} -> Dupe: ${aiData.dupeOf}`);
        }
      } catch (e: any) {
        console.warn(`Error enriqueciendo ${d.name}:`, e.message);
      }
    }

    res.json({
      success: true,
      processed: enrichedResults.length,
      details: enrichedResults
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/perfumes/catalog
 * Devuelve el catálogo de perfumes con stock desglosado y datos enriquecidos
 */
perfumeAdvisorRouter.get('/catalog', async (_req: Request, res: Response) => {
  try {
    const productsSnap = await db().collection('products').get();
    const inventorySnap = await db().collection('inventory').get();

    // Indexar stock por productId
    const stockLocalMap = new Map<string, number>();
    const stockEcMap = new Map<string, number>();
    const stockUsaMap = new Map<string, number>();

    inventorySnap.docs.forEach(doc => {
      const d = doc.data();
      const pid = d.productId;
      if (!pid) return;
      const loc = (d.location || '').toLowerCase();
      const qty = Number(d.quantity) || 0;

      if (loc.includes('local') || loc.includes('tienda') || loc.includes('mostrador')) {
        stockLocalMap.set(pid, (stockLocalMap.get(pid) || 0) + qty);
      } else if (loc.includes('usa') || loc.includes('eeuu') || loc.includes('estados unidos')) {
        stockUsaMap.set(pid, (stockUsaMap.get(pid) || 0) + qty);
      } else {
        stockEcMap.set(pid, (stockEcMap.get(pid) || 0) + qty);
      }
    });

    const perfumes = productsSnap.docs
      .filter(doc => {
        const cat = (doc.data().category || '').toLowerCase();
        return cat.includes('perfume');
      })
      .map(doc => {
        const d = doc.data();
        const id = doc.id;
        const stockLocal = stockLocalMap.get(id) || 0;
        const stockBodegaEc = stockEcMap.get(id) || 0;
        const stockBodegaUsa = stockUsaMap.get(id) || 0;

        return {
          id,
          name: d.name || '',
          brand: d.brand || '',
          sku: d.sku || '',
          barcode: d.barcode || '',
          category: d.category || 'Perfumes',
          imageUrl: d.imageUrl || (Array.isArray(d.images) && d.images[0]) || '',
          price: d.salePrice2 || d.pvp || d.salePrice1 || 0,
          salePrice2: d.salePrice2 || 0,
          stockLocal,
          stockBodegaEc,
          stockBodegaUsa,
          totalStock: stockLocal + stockBodegaEc + stockBodegaUsa,
          aiEnriched: !!d.aiEnriched,
          dupeOf: d.dupeOf || '',
          dupeBrand: d.dupeBrand || '',
          olfactoryFamily: d.olfactoryFamily || '',
          notes: d.notes || null,
          mainAccords: d.mainAccords || [],
          gender: d.gender || 'Unisex',
          longevity: d.longevity || '',
          bestOccasion: d.bestOccasion || '',
          salesPitch: d.salesPitch || ''
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      total: perfumes.length,
      perfumes
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
