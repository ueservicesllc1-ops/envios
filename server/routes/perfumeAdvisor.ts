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

    // Contar perfumes en ambas colecciones: perfumes y products
    const [perfumesSnap, productsSnap] = await Promise.all([
      db().collection('perfumes').get(),
      db().collection('products').get()
    ]);

    let totalPerfumes = perfumesSnap.size;
    let enrichedCount = perfumesSnap.docs.filter(doc => doc.data().aiEnriched === true).length;

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
    const mode = req.body?.mode === 'inventory' ? 'inventory' : 'catalog';
    const enrichedResults: string[] = [];

    let pendingDocs: { id: string; collection: string; data: any }[] = [];

    if (mode === 'inventory') {
      // 1. Priorizar productos con stock físico en bodegas/tienda
      const inventorySnap = await db().collection('inventory').get();
      const inStockProductIds = new Set<string>();
      inventorySnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.productId && Number(d.quantity) > 0) {
          inStockProductIds.add(d.productId);
        }
      });

      const productsSnap = await db().collection('products').get();
      pendingDocs = productsSnap.docs
        .filter(doc => {
          const d = doc.data();
          const cat = (d.category || '').toLowerCase();
          return cat.includes('perfume') && inStockProductIds.has(doc.id) && d.aiEnriched !== true;
        })
        .slice(0, limit)
        .map(doc => ({ id: doc.id, collection: 'products', data: doc.data() }));
    } else {
      // 2. Modo Catálogo: perfumes del catálogo general
      const perfumesSnap = await db().collection('perfumes').get();
      pendingDocs = perfumesSnap.docs
        .filter(doc => doc.data().aiEnriched !== true)
        .slice(0, limit)
        .map(doc => ({ id: doc.id, collection: 'perfumes', data: doc.data() }));

      if (pendingDocs.length < limit) {
        const remaining = limit - pendingDocs.length;
        const productsSnap = await db().collection('products').get();
        const pendingProducts = productsSnap.docs
          .filter(doc => {
            const d = doc.data();
            const cat = (d.category || '').toLowerCase();
            return cat.includes('perfume') && d.aiEnriched !== true;
          })
          .slice(0, remaining)
          .map(doc => ({ id: doc.id, collection: 'products', data: doc.data() }));

        pendingDocs = [...pendingDocs, ...pendingProducts];
      }
    }

    for (let i = 0; i < pendingDocs.length; i++) {
      const item = pendingDocs[i];
      const d = item.data;
      try {
        const aiData = await perfumeAiService.enrichByNameOrBarcode(d.name, d.brand, d.barcode || d.sku);
        if (aiData) {
          await db().collection(item.collection).doc(item.id).update({
            aiEnriched: true,
            aiEnrichedAt: new Date().toISOString(),
            dupeOf: aiData.dupeOf || '',
            dupeBrand: aiData.dupeBrand || '',
            olfactoryFamily: aiData.olfactoryFamily || '',
            gender: aiData.gender || 'Unisex',
            concentration: aiData.concentration || 'Eau de Parfum',
            notes: aiData.notes || { top: [], middle: [], base: [] },
            mainAccords: aiData.mainAccords || [],
            longevity: aiData.longevity || '',
            bestOccasion: aiData.bestOccasion || '',
            salesPitch: aiData.salesPitch || '',
            description: aiData.description || d.description || aiData.salesPitch || '',
            ...(d.brand ? {} : { brand: aiData.brand })
          });
          enrichedResults.push(`${d.name} -> Dupe: ${aiData.dupeOf || 'Identificado'}`);
        }
      } catch (e: any) {
        console.warn(`Error enriqueciendo ${d.name}:`, e.message);
      }

      // Pausa de 3.5 segundos para respetar los límites del Free Tier (15 RPM)
      if (i < pendingDocs.length - 1) {
        await new Promise(r => setTimeout(r, 3500));
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
 * POST /api/perfumes/enrich-one
 * Enriquece un perfume individual desde el panel web admin y guarda notas, dupe y descripción en Firestore
 */
perfumeAdvisorRouter.post('/enrich-one', async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId requerido' });
    }

    let targetCollection = 'products';
    let doc = await db().collection('products').doc(productId).get();
    if (!doc.exists) {
      doc = await db().collection('perfumes').doc(productId).get();
      if (doc.exists) {
        targetCollection = 'perfumes';
      } else {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }
    }

    const p = doc.data()!;
    const aiData = await perfumeAiService.enrichByNameOrBarcode(
      p.name,
      p.brand,
      p.barcode || p.sku
    );

    if (!aiData) {
      return res.status(422).json({ success: false, error: 'No se pudo obtener información con IA' });
    }

    const updatePayload: any = {
      aiEnriched: true,
      aiEnrichedAt: new Date().toISOString(),
      dupeOf: aiData.dupeOf || '',
      dupeBrand: aiData.dupeBrand || '',
      olfactoryFamily: aiData.olfactoryFamily || '',
      gender: aiData.gender || 'Unisex',
      concentration: aiData.concentration || 'Eau de Parfum',
      notes: aiData.notes || { top: [], middle: [], base: [] },
      mainAccords: aiData.mainAccords || [],
      longevity: aiData.longevity || '',
      bestOccasion: aiData.bestOccasion || '',
      salesPitch: aiData.salesPitch || '',
      description: aiData.description || p.description || aiData.salesPitch || '',
      ...(p.brand ? {} : { brand: aiData.brand })
    };

    await db().collection(targetCollection).doc(productId).update(updatePayload);

    const stock = await getStockForProduct(productId);

    res.json({
      success: true,
      perfume: {
        id: productId,
        ...p,
        ...updatePayload,
        ...stock,
        price: p.salePrice2 || p.pvp || p.salePrice1 || 0
      }
    });
  } catch (err: any) {
    console.error('Error in /enrich-one:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/perfumes/investigate-preview
 * Investiga un perfume por nombre/marca/código usando IA y devuelve los datos
 * para previsualizar y autocompletar en el formulario ANTES de guardar.
 */
perfumeAdvisorRouter.post('/investigate-preview', async (req: Request, res: Response) => {
  try {
    const { name, brand, barcode, sku } = req.body;
    if (!name && !barcode && !sku) {
      return res.status(400).json({ success: false, error: 'Se requiere al menos el nombre o código del perfume' });
    }

    const aiData = await perfumeAiService.enrichByNameOrBarcode(
      name || '',
      brand || '',
      barcode || sku || ''
    );

    if (!aiData) {
      return res.status(422).json({ success: false, error: 'No se pudo obtener información con IA' });
    }

    res.json({
      success: true,
      analysis: aiData
    });
  } catch (err: any) {
    console.error('Error in /investigate-preview:', err);
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
        if (!cat.includes('perfume')) return false;
        const id = doc.id;
        const stockLocal = stockLocalMap.get(id) || 0;
        const stockBodegaEc = stockEcMap.get(id) || 0;
        const stockBodegaUsa = stockUsaMap.get(id) || 0;
        // Solo perfumes con stock físico en bodega o tienda
        return (stockLocal + stockBodegaEc + stockBodegaUsa) > 0;
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

/**
 * POST /api/perfumes/find-dupe
 * Busca el dupe o perfume de diseñador consultado (ej: "Creed Aventus" o "Aventus").
 * 1. Cruza contra fragranceReferences (50 referencias precargadas + dinámicas)
 * 2. Cruza contra el inventario físico real en `products` + `inventory` (Tienda, Bodega EC, Bodega USA)
 * 3. Si no existe en la base, consulta a Gemini AI en vivo para descubrir los clones y los guarda
 * 4. Devuelve candidatos clasificados: enTienda, enBodega, paraImportar
 */
perfumeAdvisorRouter.post('/find-dupe', async (req: Request, res: Response) => {
  try {
    const { query: queryTerm } = req.body;
    if (!queryTerm || typeof queryTerm !== 'string' || !queryTerm.trim()) {
      return res.status(400).json({ success: false, error: 'Término de búsqueda requerido' });
    }

    const cleanQ = queryTerm.trim().toLowerCase();

    // 1. Obtener inventario físico desglosado
    const productsSnap = await db().collection('products').get();
    const inventorySnap = await db().collection('inventory').get();

    const stockLocalMap = new Map<string, number>();
    const stockEcMap = new Map<string, number>();
    const stockUsaMap = new Map<string, number>();

    inventorySnap.docs.forEach(doc => {
      const d = doc.data();
      const pid = d.productId;
      if (!pid) return;
      const loc = (d.location || '').toLowerCase();
      const qty = Number(d.quantity) || 0;

      if (loc.includes('local') || loc.includes('tienda') || loc.includes('mostrador') || loc.includes('babahoyo')) {
        stockLocalMap.set(pid, (stockLocalMap.get(pid) || 0) + qty);
      } else if (loc.includes('usa') || loc.includes('eeuu') || loc.includes('estados unidos')) {
        stockUsaMap.set(pid, (stockUsaMap.get(pid) || 0) + qty);
      } else {
        stockEcMap.set(pid, (stockEcMap.get(pid) || 0) + qty);
      }
    });

    // Indexar nuestros perfumes físicos reales
    const myPerfumes = productsSnap.docs
      .filter(doc => (doc.data().category || '').toLowerCase().includes('perfume'))
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
          price: d.salePrice2 || d.pvp || d.salePrice1 || d.price || 0,
          imageUrl: d.imageUrl || (Array.isArray(d.images) && d.images[0]) || '',
          dupeOf: d.dupeOf || '',
          dupeBrand: d.dupeBrand || '',
          notes: d.notes || null,
          mainAccords: d.mainAccords || [],
          gender: d.gender || 'Unisex',
          salesPitch: d.salesPitch || '',
          stockLocal,
          stockBodegaEc,
          stockBodegaUsa,
          totalStock: stockLocal + stockBodegaEc + stockBodegaUsa
        };
      });

    // 2. Buscar en la colección de Referencias Olfativas (`fragranceReferences`)
    const refSnap = await db().collection('fragranceReferences').get();
    let matchedRef: any = null;

    for (const doc of refSnap.docs) {
      const r = doc.data();
      const rName = (r.name || '').toLowerCase();
      const rBrand = (r.brand || '').toLowerCase();
      const combined = `${rBrand} ${rName}`.toLowerCase();

      if (combined.includes(cleanQ) || cleanQ.includes(rName) || rName.includes(cleanQ)) {
        matchedRef = { id: doc.id, ...r };
        break;
      }
    }

    // 3. Si no existe en las referencias estáticas, llamar a Gemini en vivo
    if (!matchedRef) {
      try {
        const aiRef = await perfumeAiService.researchReferenceWithDupes(queryTerm);
        if (aiRef && aiRef.name) {
          matchedRef = {
            id: aiRef.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            ...aiRef,
            requestCount: 1,
            createdAt: new Date().toISOString()
          };
          // Guardar en la base de datos para que quede en el sistema para siempre
          await db().collection('fragranceReferences').doc(matchedRef.id).set(matchedRef, { merge: true });
        }
      } catch (aiErr: any) {
        console.warn('Error investigando referencia con Gemini:', aiErr.message);
      }
    }

    // 4. Si encontramos la referencia o el término, cruzar contra nuestro inventario
    const knownDupesList: any[] = matchedRef?.knownDupes || [];
    const searchTargetNames = [
      cleanQ,
      matchedRef?.name?.toLowerCase(),
      ...knownDupesList.map(k => k.name.toLowerCase())
    ].filter(Boolean);

    // Encontrar candidatos físicos en nuestra tienda y bodega
    const physicalMatches = myPerfumes.filter(p => {
      const pName = p.name.toLowerCase();
      const pBrand = p.brand.toLowerCase();
      const pDupe = (p.dupeOf || '').toLowerCase();

      // Coincide por campo dupeOf explícito
      if (pDupe && (cleanQ.includes(pDupe) || pDupe.includes(cleanQ) || (matchedRef?.name && pDupe.includes(matchedRef.name.toLowerCase())))) {
        return true;
      }

      // Coincide con alguno de los nombres conocidos de dupes
      return searchTargetNames.some(target => pName.includes(target) || (target.length > 4 && target.split(' ').every((w: string) => pName.includes(w))));
    });

    // Separar por disponibilidad
    const enTienda = physicalMatches.filter(p => p.stockLocal > 0);
    const enBodega = physicalMatches.filter(p => p.stockLocal <= 0 && (p.stockBodegaEc > 0 || p.stockBodegaUsa > 0));

    // Identificar cuáles dupes conocidos NO tenemos en físico para poder pedirlos/importarlos
    const physicalNamesLower = physicalMatches.map(p => p.name.toLowerCase());
    const paraImportar = knownDupesList.filter(kd => {
      const kdName = kd.name.toLowerCase();
      return !physicalNamesLower.some(pn => pn.includes(kdName) || kdName.includes(pn));
    });

    res.json({
      success: true,
      query: queryTerm,
      reference: matchedRef ? {
        name: matchedRef.name,
        brand: matchedRef.brand,
        gender: matchedRef.gender,
        olfactoryFamily: matchedRef.olfactoryFamily,
        keyNotes: matchedRef.keyNotes || [],
        mainAccords: matchedRef.mainAccords || [],
        description: matchedRef.description || ''
      } : null,
      candidates: {
        enTienda,
        enBodega,
        paraImportar
      }
    });
  } catch (err: any) {
    console.error('Error in /find-dupe:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/perfumes/request-dupe
 * Registra el interés de compra de un cliente para un perfume que no tenemos en inventario
 * Permite a la gerencia saber qué perfumes pedir e importar
 */
perfumeAdvisorRouter.post('/request-dupe', async (req: Request, res: Response) => {
  try {
    const { perfumeName, dupeName, brand, referenceName, referenceBrand, advisorName, customerPhone, notes } = req.body;
    const finalPerfumeName = (perfumeName || dupeName || '').trim();
    if (!finalPerfumeName) {
      return res.status(400).json({ success: false, error: 'Nombre de perfume requerido' });
    }

    const docRef = await db().collection('requestedPerfumes').add({
      perfumeName: finalPerfumeName,
      brand: (brand || '').trim(),
      referenceName: (referenceName || '').trim(),
      referenceBrand: (referenceBrand || '').trim(),
      advisorName: (advisorName || 'Asesor').trim(),
      customerPhone: (customerPhone || '').trim(),
      notes: (notes || '').trim(),
      status: 'PENDIENTE_PEDIDO',
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      id: docRef.id,
      message: 'Solicitud de importación registrada exitosamente'
    });
  } catch (err: any) {
    console.error('Error in /request-dupe:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/perfumes/requested
 * Obtiene la lista de perfumes solicitados por clientes desde el asesor de ventas
 */
perfumeAdvisorRouter.get('/requested', async (req: Request, res: Response) => {
  try {
    const snap = await db().collection('requestedPerfumes').orderBy('createdAt', 'desc').limit(100).get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, count: items.length, items });
  } catch (err: any) {
    console.error('Error in GET /requested:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/perfumes/requested/:id
 * Actualiza el estado de una solicitud ('PENDIENTE_PEDIDO', 'IMPORTADO', 'DESCARTADO')
 */
perfumeAdvisorRouter.patch('/requested/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await db().collection('requestedPerfumes').doc(id).update(updateData);
    res.json({ success: true, message: 'Estado actualizado' });
  } catch (err: any) {
    console.error('Error in PATCH /requested/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

