import {
  collection,
  onSnapshot,
  getDocs,
  getFirestore,
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { Product } from '../types/pos';

const firebaseConfig = {
  apiKey: "AIzaSyDaPRQEibEf7rpwvd9g-APfTad0JCVVFHw",
  authDomain: "envios-aaf94.firebaseapp.com",
  projectId: "envios-aaf94",
  storageBucket: "envios-aaf94.firebasestorage.app",
  messagingSenderId: "301889994673",
  appId: "1:301889994673:web:0b72ebf814b7f8c1b9b1e9"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export class CatalogService {
  /**
   * Observa productos e inventario en tiempo real, replicando CatalogRepository.kt:
   * - Solo perfumes
   * - Solo con stock físico total > 0 (Local, Bodega EC, Bodega USA)
   * - Precio salePrice2 (precio de tienda local), o pvp
   */
  observeCatalog(
    priceField: string = 'salePrice2',
    onUpdate: (products: Product[]) => void,
    onError?: (err: any) => void
  ): () => void {
    let productsMap: Map<string, any> = new Map();
    let stockLocal: Map<string, number> = new Map();
    let stockEc: Map<string, number> = new Map();
    let stockUsa: Map<string, number> = new Map();

    const publish = () => {
      const list: Product[] = [];
      for (const [id, data] of productsMap.entries()) {
        const prod = this.toProduct(
          id,
          data,
          stockLocal.get(id) || 0,
          stockEc.get(id) || 0,
          stockUsa.get(id) || 0,
          priceField
        );
        if (prod) {
          list.push(prod);
        }
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(list);
    };

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const map = new Map<string, any>();
        snapshot.docs.forEach((d) => map.set(d.id, d.data()));
        productsMap = map;
        publish();
      },
      onError
    );

    const unsubInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        const mLocal = new Map<string, number>();
        const mEc = new Map<string, number>();
        const mUsa = new Map<string, number>();

        snapshot.docs.forEach((doc) => {
          const d = doc.data();
          const pid = d.productId;
          if (!pid) return;

          const loc = String(d.location || '').trim().toLowerCase();
          const qty = Number(d.quantity) || 0;

          if (loc.includes('local') || loc.includes('tienda') || loc.includes('mostrador')) {
            mLocal.set(pid, (mLocal.get(pid) || 0) + qty);
          } else if (loc.includes('usa') || loc.includes('eeuu') || loc.includes('estados unidos')) {
            mUsa.set(pid, (mUsa.get(pid) || 0) + qty);
          } else if (
            loc.includes('ecuador') ||
            loc.includes('babahoyo') ||
            loc.includes('principal') ||
            loc.includes('bodega')
          ) {
            mEc.set(pid, (mEc.get(pid) || 0) + qty);
          }
        });

        stockLocal = mLocal;
        stockEc = mEc;
        stockUsa = mUsa;
        publish();
      },
      onError
    );

    return () => {
      unsubProducts();
      unsubInventory();
    };
  }

  private toProduct(
    id: string,
    d: any,
    sLocal: number,
    sEc: number,
    sUsa: number,
    priceField: string
  ): Product | null {
    const name = d.name;
    if (!name) return null;

    const category = String(d.category || '').trim().toLowerCase();
    // 1. Solo categoría Perfumes
    if (!category.includes('perfume')) {
      return null;
    }

    // 2. Solo perfumes que tengan stock físico en alguna bodega o local
    const totalStock = sLocal + sEc + sUsa;
    if (totalStock <= 0) {
      return null;
    }

    // 3. Precio de Tienda: salePrice2 estricto (no salePrice1 mayorista), o pvp
    let price = 0;
    if (Number(d.salePrice2) > 0) {
      price = Number(d.salePrice2);
    } else if (Number(d.pvp) > 0) {
      price = Number(d.pvp);
    } else if (priceField && priceField !== 'salePrice1' && Number(d[priceField]) > 0) {
      price = Number(d[priceField]);
    } else if (Number(d.salePrice1) > 0) {
      price = Number(d.salePrice1);
    }

    const firstImage = Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null;

    return {
      id,
      name,
      brand: d.brand || 'Falconi',
      category: d.category || 'Perfumes',
      sku: d.sku || '',
      barcode: d.barcode || '',
      imageUrl: d.imageUrl || firstImage || '/logo_falconi.png',
      price,
      stockLocal: sLocal,
      stockBodegaEc: sEc,
      stockBodegaUsa: sUsa,
    };
  }
}

export const catalogService = new CatalogService();
