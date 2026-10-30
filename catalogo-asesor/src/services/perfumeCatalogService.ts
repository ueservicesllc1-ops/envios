import { collection, getDocs, doc, getDoc, addDoc, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PerfumeItem, PerfumeStock, OlfactoryNotes } from '../types/perfume';

// B2 Public URL base
const B2_PUBLIC_BASE = 'https://f005.backblazeb2.com/file/perfumes';

// API base for backend calls (barcode scanning, AI photo identification, proxy)
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Si corre en navegador de desarrollo en la PC
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (window.location.port === '3000' || window.location.port === '5000')) {
      return 'http://localhost:5000';
    }
    // Si corre dentro de Capacitor en Android (tablet por WiFi o USB)
    if (window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && !window.location.port)) {
      return 'http://192.168.1.240:5000';
    }
    return window.location.origin;
  }
  return 'http://192.168.1.240:5000';
};

// In-memory cache for fast search & instant navigation
let memoryCache: PerfumeItem[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const perfumeCatalogService = {
  /**
   * Helper to resolve clean B2 / CDN image URL
   */
  resolveImageUrl(item: any): string {
    const raw = item.imageUrl || item.b2Url || item.image || '';
    if (!raw) return 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80';
    
    // If it's already a full valid URL, return it
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    
    // If it's a B2 path (e.g. perfumes/armaf/armaf-...)
    return `${B2_PUBLIC_BASE}/${raw.replace(/^\/+/, '')}`;
  },

  /**
   * Helper to parse notes from either object or string
   */
  parseNotes(rawNotes: any): OlfactoryNotes {
    if (!rawNotes) return { top: [], middle: [], base: [] };
    if (typeof rawNotes === 'object' && !Array.isArray(rawNotes)) {
      return {
        top: Array.isArray(rawNotes.top) ? rawNotes.top : [],
        middle: Array.isArray(rawNotes.middle) ? rawNotes.middle : [],
        base: Array.isArray(rawNotes.base) ? rawNotes.base : []
      };
    }
    return { top: [], middle: [], base: [] };
  },

  /**
   * Fetches real inventory and aggregates stock by location
   */
  async getInventoryMap(): Promise<Map<string, PerfumeStock>> {
    const stockMap = new Map<string, PerfumeStock>();
    try {
      const invSnap = await getDocs(collection(db, 'inventory'));
      invSnap.docs.forEach(docSnap => {
        const d = docSnap.data();
        const pId = d.productId;
        if (!pId) return;

        const current = stockMap.get(pId) || { local: 0, bodegaEc: 0, bodegaUsa: 0, total: 0 };
        const loc = (d.location || '').toLowerCase();
        const qty = Number(d.quantity) || 0;

        if (loc.includes('local') || loc.includes('tienda') || loc.includes('mostrador') || loc.includes('babahoyo')) {
          current.local += qty;
        } else if (loc.includes('usa') || loc.includes('eeuu') || loc.includes('estados unidos')) {
          current.bodegaUsa += qty;
        } else {
          current.bodegaEc += qty;
        }
        current.total += qty;
        stockMap.set(pId, current);
      });
    } catch (e) {
      console.warn('Error loading inventory map:', e);
    }
    return stockMap;
  },

  /**
   * Loads ONLY physical perfumes registered in `products` (POS perfumes) that have real confirmed stock
   * in Bodega USA, Bodega Ecuador, or Local/Tienda.
   * Excludes unstocked on-demand perfumes imported from external web pages.
   */
  async getAllPerfumes(forceRefresh = false): Promise<PerfumeItem[]> {
    const now = Date.now();
    if (!forceRefresh && memoryCache && (now - lastCacheTime < CACHE_TTL_MS)) {
      return memoryCache;
    }

    try {
      // 1. Fetch inventory map
      const stockMap = await this.getInventoryMap();

      // 2. Fetch auxiliary perfumes collection (ONLY for enriching dupe notes/images of registered products)
      const auxMapByBarcode = new Map<string, any>();
      const auxMapByName = new Map<string, any>();
      try {
        const perfumesSnap = await getDocs(collection(db, 'perfumes'));
        perfumesSnap.docs.forEach(docSnap => {
          const d = docSnap.data();
          const cleanSku = (d.sku || '').trim().toLowerCase();
          const cleanName = (d.name || '').trim().toLowerCase();
          if (cleanSku) auxMapByBarcode.set(cleanSku, d);
          if (cleanName) auxMapByName.set(cleanName, d);
        });
      } catch (auxErr) {
        console.warn('Error fetching aux perfumes:', auxErr);
      }

      // 3. Fetch products registered in `products`
      const productsSnap = await getDocs(collection(db, 'products'));
      const items: PerfumeItem[] = [];

      productsSnap.docs.forEach(docSnap => {
        const d = docSnap.data();
        const cat = (d.category || '').toLowerCase();
        // Solo productos de perfumería
        if (!cat.includes('perfume')) return;

        // Stock físico confirmado en bodega ecuador, bodega usa o local
        const stock = stockMap.get(docSnap.id) || { local: 0, bodegaEc: 0, bodegaUsa: 0, total: 0 };
        if (stock.total <= 0) return; // Excluir los que no tienen unidades físicas disponibles

        const barcode = (d.barcode || d.sku || '').trim();
        const cleanSku = (d.sku || barcode).trim();
        const cleanName = (d.name || '').trim().toLowerCase();

        // Enriquecer con datos auxiliares de IA (dupe, notas) si existen
        const aux = auxMapByBarcode.get(barcode.toLowerCase()) || 
                    auxMapByBarcode.get(cleanSku.toLowerCase()) || 
                    auxMapByName.get(cleanName);

        const dupeOf = d.dupeOf || aux?.dupeOf || undefined;
        const dupeBrand = d.dupeBrand || aux?.dupeBrand || undefined;
        const olfactoryFamily = d.olfactoryFamily || aux?.olfactoryFamily || undefined;
        const concentration = d.concentration || aux?.concentration || 'Eau de Parfum';
        const gender = d.gender || aux?.gender || 'Unisex';
        const notes = this.parseNotes(d.notes || aux?.notes);
        const mainAccords = (Array.isArray(d.mainAccords) && d.mainAccords.length > 0)
          ? d.mainAccords
          : (Array.isArray(aux?.mainAccords) ? aux.mainAccords : []);
        const longevity = d.longevity || aux?.longevity || undefined;
        const bestOccasion = d.bestOccasion || aux?.bestOccasion || undefined;
        const salesPitch = d.salesPitch || aux?.salesPitch || undefined;
        const description = d.description || aux?.description || aux?.salesPitch || '';

        const imageCandidate = this.resolveImageUrl(d.imageUrl ? d : (aux || d));

        items.push({
          id: docSnap.id,
          name: d.name || 'Perfume',
          brand: (d.brand || aux?.brand || 'Marca').trim(),
          collection: d.collection || aux?.collection || 'Inventario Físico',
          sku: cleanSku,
          barcode: barcode,
          price: Number(d.salePrice2 || d.pvp || d.salePrice1 || d.price || aux?.price || 0),
          originalPrice: d.originalPrice ? Number(d.originalPrice) : undefined,
          imageUrl: imageCandidate,
          images: Array.isArray(d.images) && d.images.length > 0 ? d.images : [imageCandidate],
          description,
          descriptionEs: d.descriptionEs || aux?.descriptionEs || '',
          dupeOf,
          dupeBrand,
          olfactoryFamily,
          gender,
          concentration,
          size: d.size || aux?.size || undefined,
          notes,
          mainAccords,
          longevity,
          bestOccasion,
          salesPitch,
          aiEnriched: Boolean(d.aiEnriched || aux?.aiEnriched || dupeOf),
          stock,
          isActive: true,
          sourceCollection: 'products'
        });
      });

      // Ordenar por defecto: primero con stock local, luego más stock total
      items.sort((a, b) => {
        const scoreA = (a.stock.local * 10) + a.stock.total;
        const scoreB = (b.stock.local * 10) + b.stock.total;
        return scoreB - scoreA;
      });

      memoryCache = items;
      lastCacheTime = now;
      return items;
    } catch (error) {
      console.error('Error in getAllPerfumes:', error);
      if (memoryCache) return memoryCache;
      throw error;
    }
  },

  /**
   * Search perfume by barcode
   */
  async findByBarcode(barcode: string): Promise<PerfumeItem | null> {
    const cleanDigits = barcode.trim().replace(/[^0-9]/g, '');
    const all = await this.getAllPerfumes();

    // 1. Exact match on barcode or sku
    let found = all.find(p => {
      const pBarcode = (p.barcode || '').trim().replace(/[^0-9]/g, '');
      const pSku = (p.sku || '').trim().replace(/[^0-9]/g, '');
      return pBarcode === cleanDigits || pSku === cleanDigits;
    });

    if (found) return found;

    // 2. Suffix/Prefix matching for UPC-A vs EAN-13 (leading zero differences)
    if (cleanDigits.length >= 8) {
      found = all.find(p => {
        const pBarcode = (p.barcode || '').trim().replace(/[^0-9]/g, '');
        const pSku = (p.sku || '').trim().replace(/[^0-9]/g, '');
        return (
          (pBarcode && (pBarcode.endsWith(cleanDigits) || cleanDigits.endsWith(pBarcode))) ||
          (pSku && (pSku.endsWith(cleanDigits) || cleanDigits.endsWith(pSku)))
        );
      });
    }

    if (found) return found;

    // 3. Fallback: Call backend AI scan-barcode endpoint
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/perfumes/scan-barcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: cleanDigits || barcode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.perfume) {
          const p = data.perfume;
          const normalized: PerfumeItem = {
            id: p.id || `scanned-${Date.now()}`,
            name: p.name || `Perfume (${barcode})`,
            brand: p.brand || 'Marca',
            sku: p.sku || barcode,
            barcode: barcode,
            price: Number(p.price || p.salePrice2 || 0),
            imageUrl: this.resolveImageUrl(p),
            description: p.description || '',
            dupeOf: p.dupeOf || undefined,
            dupeBrand: p.dupeBrand || undefined,
            olfactoryFamily: p.olfactoryFamily || undefined,
            gender: p.gender || 'Unisex',
            concentration: p.concentration || 'Eau de Parfum',
            notes: this.parseNotes(p.notes),
            mainAccords: Array.isArray(p.mainAccords) ? p.mainAccords : [],
            longevity: p.longevity || undefined,
            bestOccasion: p.bestOccasion || undefined,
            salesPitch: p.salesPitch || undefined,
            aiEnriched: true,
            stock: {
              local: p.stockLocal || 0,
              bodegaEc: p.stockBodegaEc || 0,
              bodegaUsa: p.stockBodegaUsa || 0,
              total: p.totalStock || 0
            },
            isActive: true,
            sourceCollection: 'products'
          };
          return normalized;
        }
      }
    } catch (e) {
      console.warn('Backend barcode scan failed:', e);
    }

    return null;
  },

  /**
   * Identify perfume by camera photo via Gemini Vision endpoint
   */
  async identifyByPhoto(base64Image: string): Promise<{ success: boolean; perfume?: PerfumeItem; analysis?: any; error?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/perfumes/identify-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error || 'No se pudo identificar el perfume' };
      }

      if (data.perfume && data.perfume.id) {
        const all = await this.getAllPerfumes();
        const existing = all.find(p => p.id === data.perfume.id);
        if (existing) {
          return { success: true, perfume: existing, analysis: data.perfume };
        }
      }

      // If recognized by AI without existing ID
      const p = data.perfume;
      const normalized: PerfumeItem = {
        id: `ai-photo-${Date.now()}`,
        name: p?.name || 'Perfume Identificado',
        brand: p?.brand || 'Marca',
        sku: p?.barcode || '',
        barcode: p?.barcode || '',
        price: Number(p?.price || 0),
        imageUrl: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
        description: p?.description || p?.salesPitch || '',
        dupeOf: p?.dupeOf || undefined,
        dupeBrand: p?.dupeBrand || undefined,
        olfactoryFamily: p?.olfactoryFamily || undefined,
        gender: p?.gender || 'Unisex',
        concentration: p?.concentration || 'Eau de Parfum',
        notes: this.parseNotes(p?.notes),
        mainAccords: Array.isArray(p?.mainAccords) ? p?.mainAccords : [],
        longevity: p?.longevity || undefined,
        bestOccasion: p?.bestOccasion || undefined,
        salesPitch: p?.salesPitch || undefined,
        aiEnriched: true,
        stock: { local: 0, bodegaEc: 0, bodegaUsa: 0, total: 0 },
        isActive: true,
        sourceCollection: 'perfumes'
      };

      return { success: true, perfume: normalized, analysis: p };
    } catch (e: any) {
      console.error('Error in identifyByPhoto:', e);
      return { success: false, error: e.message || 'Error de conexión con el servidor' };
    }
  },

  /**
   * Find perfumes that are dupes of the same designer fragrance
   */
  async findRelatedDupes(targetPerfume: PerfumeItem): Promise<PerfumeItem[]> {
    if (!targetPerfume.dupeOf) return [];
    const all = await this.getAllPerfumes();
    const dupeTarget = targetPerfume.dupeOf.toLowerCase().trim();
    
    return all.filter(p => {
      if (p.id === targetPerfume.id) return false;
      if (!p.dupeOf) return false;
      const otherDupe = p.dupeOf.toLowerCase().trim();
      return otherDupe.includes(dupeTarget) || dupeTarget.includes(otherDupe);
    }).slice(0, 6);
  },

  /**
   * Consulta inteligente de dupes por fragancia de diseñador (ej: "Creed Aventus")
   * Cruza con inventario físico (Local, Bodega EC, Bodega USA) y lista los que faltan para pedir.
   * Si el asesor está en la calle o con datos móviles (servidor local inaccesible),
   * consulta directamente a Firestore.
   */
  async findDupeCandidates(queryTerm: string): Promise<{
    success: boolean;
    reference?: any;
    candidates?: {
      enTienda: any[];
      enBodega: any[];
      paraImportar: any[];
    };
    error?: string;
  }> {
    const cleanQ = queryTerm.trim().toLowerCase();

    // 1. Intentar primero con backend (timeout de 3.5 segundos para no colgar si está fuera de la tienda)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${getApiBaseUrl()}/api/perfumes/find-dupe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryTerm }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success) return data;
      }
    } catch {
      // Backend inaccesible (asesor en datos móviles / red remota) -> pasar al fallback de Firestore
    }

    // 2. Fallback resiliente directo a Firebase Firestore
    try {
      const allPerfumes = await this.getAllPerfumes();
      const refSnap = await getDocs(collection(db, 'fragranceReferences'));
      let matchedRef: any = null;

      for (const docSnap of refSnap.docs) {
        const r = docSnap.data();
        const rName = (r.name || '').toLowerCase();
        const rBrand = (r.brand || '').toLowerCase();
        const combined = `${rBrand} ${rName}`.toLowerCase();

        if (combined.includes(cleanQ) || cleanQ.includes(rName) || rName.includes(cleanQ)) {
          matchedRef = { id: docSnap.id, ...r };
          break;
        }
      }

      const knownDupesList: any[] = matchedRef?.knownDupes || [];
      const searchTargetNames = [
        cleanQ,
        matchedRef?.name?.toLowerCase(),
        ...knownDupesList.map(k => (k.name || '').toLowerCase())
      ].filter(Boolean);

      const physicalMatches = allPerfumes.filter(p => {
        const pName = p.name.toLowerCase();
        const pDupe = (p.dupeOf || '').toLowerCase();

        if (pDupe && (cleanQ.includes(pDupe) || pDupe.includes(cleanQ) || (matchedRef?.name && pDupe.includes(matchedRef.name.toLowerCase())))) {
          return true;
        }

        return searchTargetNames.some(target => pName.includes(target) || (target.length > 4 && target.split(' ').every((w: string) => pName.includes(w))));
      });

      const enTienda = physicalMatches.filter(p => p.stock.local > 0);
      const enBodega = physicalMatches.filter(p => p.stock.local <= 0 && (p.stock.bodegaEc > 0 || p.stock.bodegaUsa > 0));

      const physicalNamesLower = physicalMatches.map(p => p.name.toLowerCase());
      const paraImportar = knownDupesList.filter(kd => {
        const kdName = (kd.name || '').toLowerCase();
        return !physicalNamesLower.some(pn => pn.includes(kdName) || kdName.includes(pn));
      });

      return {
        success: true,
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
      };
    } catch (e: any) {
      console.error('Error in fallback findDupeCandidates:', e);
      return { success: false, error: e.message || 'Error consultando candidatos de dupe' };
    }
  },

  /**
   * Registra una solicitud de importación cuando un cliente pide un perfume que no está en stock
   */
  async requestImport(data: {
    perfumeName: string;
    brand?: string;
    referenceName?: string;
    referenceBrand?: string;
    advisorName?: string;
    customerPhone?: string;
    notes?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    // 1. Intentar backend con timeout de 3 segundos
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${getApiBaseUrl()}/api/perfumes/request-dupe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend inaccesible
    }

    // 2. Fallback: Guardar directamente en Firestore
    try {
      await addDoc(collection(db, 'requestedPerfumes'), {
        ...data,
        status: 'PENDIENTE_PEDIDO',
        createdAt: new Date().toISOString(),
        source: 'APP_ASESOR_DIRECT'
      });
      return { success: true, message: 'Solicitud registrada directamente en Firestore' };
    } catch (e: any) {
      console.error('Error saving requestedPerfume to Firestore:', e);
      return { success: false, error: e.message || 'Error registrando solicitud' };
    }
  }
};
