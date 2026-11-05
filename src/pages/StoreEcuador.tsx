import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Package,
  Search,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ScanLine,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  PackageCheck,
  Eye,
  X,
  Edit3,
  Save,
  Loader2,
  Check,
  Plus,
  Minus,
  Trash2,
  Undo2,
  ArrowUpDown,
  AlertTriangle
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product, InventoryItem } from '../types';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';

interface StoreProductItem {
  id: string; // inventory doc id
  productId: string;
  product: Product;
  quantity: number;
  location: string;
  unitPrice?: number;
  cost?: number;
}

const StoreEcuador: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [storeItems, setStoreItems] = useState<StoreProductItem[]>([]);
  const [allCatalogProducts, setAllCatalogProducts] = useState<Product[]>([]);
  const [bodegaEcuadorStockMap, setBodegaEcuadorStockMap] = useState<Map<string, number>>(new Map());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Edit Prices State
  const [editingItem, setEditingItem] = useState<StoreProductItem | null>(null);
  const [editPrice1, setEditPrice1] = useState<string>(''); // Mayorista (salePrice1)
  const [editPrice2, setEditPrice2] = useState<string>(''); // Tienda / Minorista (salePrice2)
  const [editPvp, setEditPvp] = useState<string>(''); // PVP
  const [editCost, setEditCost] = useState<string>(''); // Costo
  const [savingPrices, setSavingPrices] = useState(false);

  // Modal Agregar Producto a Tienda Local
  const [showAddModal, setShowAddModal] = useState(false);
  const [addProductSearch, setAddProductSearch] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState<number>(1);
  const [deductFromBodega, setDeductFromBodega] = useState<boolean>(true);
  const [savingAdd, setSavingAdd] = useState(false);

  // Modal Retornar a Bodega Ecuador
  const [returningItem, setReturningItem] = useState<StoreProductItem | null>(null);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [savingReturn, setSavingReturn] = useState(false);

  // Modal Modificar Cantidad / Stock
  const [adjustingItem, setAdjustingItem] = useState<StoreProductItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [syncWithBodegaOnAdjust, setSyncWithBodegaOnAdjust] = useState<boolean>(true);
  const [savingAdjust, setSavingAdjust] = useState(false);

  useEffect(() => {
    loadStoreInventory();
  }, []);

  const loadStoreInventory = async () => {
    try {
      setLoading(true);

      const [allProducts, invSnap] = await Promise.all([
        productService.getAll(),
        getDocs(collection(db, 'inventory'))
      ]);

      setAllCatalogProducts(allProducts);

      const productMap = new Map<string, Product>();
      allProducts.forEach(p => productMap.set(p.id, p));

      // Mapear stock en Bodega Ecuador
      const ecuadorStock = new Map<string, number>();
      invSnap.docs.forEach(d => {
        const data = d.data() as any;
        const loc = String(data.location || '').toLowerCase();
        if (loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local')) {
          const q = Number(data.quantity) || 0;
          if (data.productId) {
            ecuadorStock.set(data.productId, (ecuadorStock.get(data.productId) || 0) + q);
          }
        }
      });
      setBodegaEcuadorStockMap(ecuadorStock);

      // Mapear stock en Tienda Local
      const itemsByProduct = new Map<string, StoreProductItem>();

      invSnap.docs.forEach(docSnap => {
        const inv: any = docSnap.data();
        const loc = String(inv.location || '').toLowerCase();
        const isTienda = loc.includes('tienda') || loc.includes('local') || loc.includes('mostrador');

        if (isTienda && inv.productId) {
          const qty = Number(inv.quantity) || 0;
          if (qty > 0) {
            const prod = productMap.get(inv.productId) || inv.product || {
              id: inv.productId,
              name: 'Producto sin catálogo',
              category: 'Perfumes',
              salePrice2: inv.unitPrice || 0,
              salePrice1: inv.unitPrice || 0
            };

            const existing = itemsByProduct.get(inv.productId);
            if (existing) {
              existing.quantity += qty;
            } else {
              itemsByProduct.set(inv.productId, {
                id: docSnap.id,
                productId: inv.productId,
                product: prod,
                quantity: qty,
                location: inv.location || 'Tienda Local',
                unitPrice: inv.unitPrice || prod.salePrice2 || prod.salePrice1,
                cost: inv.cost || prod.cost
              });
            }
          }
        }
      });

      const list = Array.from(itemsByProduct.values());
      list.sort((a, b) => (a.product.name || '').localeCompare(b.product.name || ''));
      setStoreItems(list);
    } catch (err) {
      console.error('Error cargando inventario de Tienda Local:', err);
      toast.error('Error al cargar inventario de Tienda Local');
    } finally {
      setLoading(false);
    }
  };

  // ─── 1. EDITAR PRECIOS ────────────────────────────────────────────────────────

  const handleOpenEditPrice = (item: StoreProductItem) => {
    setEditingItem(item);
    setEditPrice1(String(item.product.salePrice1 ?? 0));
    setEditPrice2(String(item.product.salePrice2 ?? 0));
    setEditPvp(String(item.product.pvp ?? item.product.salePrice2 ?? 0));
    setEditCost(String(item.product.cost ?? 0));
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const p1 = parseFloat(editPrice1);
    const p2 = parseFloat(editPrice2);
    const pvp = parseFloat(editPvp);
    const cost = parseFloat(editCost);

    if (isNaN(p1) || p1 < 0) {
      toast.error('Precio mayorista inválido');
      return;
    }
    if (isNaN(p2) || p2 < 0) {
      toast.error('Precio tienda inválido');
      return;
    }

    try {
      setSavingPrices(true);
      const productId = editingItem.productId;

      // 1. Actualizar catálogo maestro products/{productId}
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        salePrice1: p1,
        salePrice2: p2,
        pvp: !isNaN(pvp) ? pvp : p2,
        cost: !isNaN(cost) ? cost : (editingItem.product.cost || 0),
        updatedAt: Timestamp.now()
      });

      // 2. Actualizar inventarios en todo el sistema
      const invQ = query(collection(db, 'inventory'), where('productId', '==', productId));
      const invSnap = await getDocs(invQ);

      if (!invSnap.empty) {
        const batch = writeBatch(db);
        invSnap.docs.forEach(docSnap => {
          const d = docSnap.data() as any;
          const qty = Number(d.quantity) || 0;
          const loc = String(d.location || '').toLowerCase();
          const isTienda = loc.includes('tienda') || loc.includes('local') || loc.includes('mostrador');
          const unitPrice = isTienda ? p2 : p1;

          batch.update(docSnap.ref, {
            unitPrice,
            totalPrice: unitPrice * qty,
            cost: !isNaN(cost) ? cost : (d.cost || 0),
            totalCost: (!isNaN(cost) ? cost : (d.cost || 0)) * qty,
            totalValue: (!isNaN(cost) ? cost : (d.cost || 0)) * qty,
            'product.salePrice1': p1,
            'product.salePrice2': p2,
            'product.pvp': !isNaN(pvp) ? pvp : p2,
            'product.cost': !isNaN(cost) ? cost : (d.cost || 0),
            lastUpdated: Timestamp.now()
          });
        });
        await batch.commit();
      }

      setStoreItems(prev => prev.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            product: {
              ...item.product,
              salePrice1: p1,
              salePrice2: p2,
              pvp: !isNaN(pvp) ? pvp : p2,
              cost: !isNaN(cost) ? cost : item.product.cost
            },
            unitPrice: p2
          };
        }
        return item;
      }));

      toast.success('¡Precios actualizados en todo el sistema!');
      setEditingItem(null);
    } catch (err) {
      console.error('Error guardando precios:', err);
      toast.error('Error al actualizar precios');
    } finally {
      setSavingPrices(false);
    }
  };

  // ─── 2. AGREGAR A TIENDA LOCAL ───────────────────────────────────────────────

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setAddProductSearch('');
    setSelectedProductToAdd(null);
    setAddQty(1);
    setDeductFromBodega(true);
  };

  const handleConfirmAddProduct = async () => {
    if (!selectedProductToAdd || addQty <= 0) {
      toast.error('Selecciona un producto y cantidad válida');
      return;
    }

    try {
      setSavingAdd(true);
      const productId = selectedProductToAdd.id;
      const prod = selectedProductToAdd;
      const unitPrice = prod.salePrice2 || prod.salePrice1 || 0;
      const cost = prod.cost || 0;

      const batch = writeBatch(db);

      // 1. Si se debe deducir de Bodega Ecuador
      if (deductFromBodega) {
        const ecuQ = query(
          collection(db, 'inventory'),
          where('productId', '==', productId)
        );
        const ecuSnap = await getDocs(ecuQ);
        const ecuDoc = ecuSnap.docs.find(d => {
          const loc = String((d.data() as any).location || '').toLowerCase();
          return loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local');
        });

        if (ecuDoc) {
          const currentEcuQty = Number((ecuDoc.data() as any).quantity) || 0;
          const newEcuQty = Math.max(0, currentEcuQty - addQty);
          batch.update(ecuDoc.ref, {
            quantity: newEcuQty,
            totalCost: newEcuQty * cost,
            totalValue: newEcuQty * cost,
            lastUpdated: Timestamp.now()
          });
        }
      }

      // 2. Agregar o incrementar en Tienda Local
      const tiendaQ = query(
        collection(db, 'inventory'),
        where('productId', '==', productId)
      );
      const tiendaSnap = await getDocs(tiendaQ);
      const tiendaDoc = tiendaSnap.docs.find(d => {
        const loc = String((d.data() as any).location || '').toLowerCase();
        return loc.includes('tienda') || loc.includes('local');
      });

      if (tiendaDoc) {
        const currentQty = Number((tiendaDoc.data() as any).quantity) || 0;
        const newQty = currentQty + addQty;
        batch.update(tiendaDoc.ref, {
          quantity: newQty,
          totalPrice: newQty * unitPrice,
          totalCost: newQty * cost,
          totalValue: newQty * cost,
          lastUpdated: Timestamp.now()
        });
      } else {
        const newRef = doc(collection(db, 'inventory'));
        batch.set(newRef, {
          productId,
          product: {
            id: productId,
            name: prod.name,
            barcode: prod.barcode || prod.sku || '',
            sku: prod.sku || '',
            imageUrl: prod.imageUrl || '',
            salePrice1: prod.salePrice1 || 0,
            salePrice2: unitPrice,
            cost: cost,
            dupeOf: (prod as any).dupeOf || '',
            dupeBrand: (prod as any).dupeBrand || ''
          },
          quantity: addQty,
          unitPrice,
          cost,
          totalPrice: addQty * unitPrice,
          totalCost: addQty * cost,
          totalValue: addQty * cost,
          location: 'Tienda Local',
          status: 'stock',
          lastUpdated: Timestamp.now()
        });
      }

      await batch.commit();

      toast.success(`✓ ${addQty} unidad(es) de "${prod.name}" ingresadas a Tienda Local`);
      setShowAddModal(false);
      await loadStoreInventory();
    } catch (err: any) {
      console.error('Error agregando a Tienda Local:', err);
      toast.error(err.message || 'Error al agregar producto a Tienda Local');
    } finally {
      setSavingAdd(false);
    }
  };

  // ─── ACCIONES RÁPIDAS DE CANTIDAD (+1 / -1 EN TIENDA) ────────────────────────

  const handleQuickAddOne = async (item: StoreProductItem) => {
    try {
      const productId = item.productId;
      const prod = item.product;
      const unitPrice = item.unitPrice || prod.salePrice2 || prod.salePrice1 || 0;
      const cost = prod.cost || item.cost || 0;
      const ecStock = bodegaEcuadorStockMap.get(productId) || 0;

      const batch = writeBatch(db);

      // Si hay stock en Bodega Ecuador, descontar 1
      if (ecStock > 0) {
        const ecuQ = query(collection(db, 'inventory'), where('productId', '==', productId));
        const ecuSnap = await getDocs(ecuQ);
        const ecuDoc = ecuSnap.docs.find(d => {
          const loc = String((d.data() as any).location || '').toLowerCase();
          return loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local');
        });
        if (ecuDoc) {
          const currentEcuQty = Number((ecuDoc.data() as any).quantity) || 0;
          const newEcuQty = Math.max(0, currentEcuQty - 1);
          batch.update(ecuDoc.ref, {
            quantity: newEcuQty,
            totalCost: newEcuQty * cost,
            totalValue: newEcuQty * cost,
            lastUpdated: Timestamp.now()
          });
          setBodegaEcuadorStockMap(prev => new Map(prev).set(productId, newEcuQty));
        }
      }

      // Sumar 1 en Tienda Local
      const tiendaDocRef = doc(db, 'inventory', item.id);
      const newQty = item.quantity + 1;
      batch.update(tiendaDocRef, {
        quantity: newQty,
        totalPrice: newQty * unitPrice,
        totalCost: newQty * cost,
        totalValue: newQty * cost,
        lastUpdated: Timestamp.now()
      });

      await batch.commit();

      setStoreItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
      toast.success(`+1 unidad agregada a "${prod.name}" (Total en tienda: ${newQty})`);
    } catch (err: any) {
      console.error('Error al agregar unidad:', err);
      toast.error('Error al sumar unidad');
    }
  };

  const handleQuickSubtractOne = async (item: StoreProductItem) => {
    if (item.quantity <= 1) {
      // Si solo queda 1 unidad, abrir modal para confirmar si la retorna a bodega
      handleOpenReturnModal(item);
      return;
    }

    try {
      const productId = item.productId;
      const prod = item.product;
      const unitPrice = item.unitPrice || prod.salePrice2 || prod.salePrice1 || 0;
      const cost = prod.cost || item.cost || 0;

      const batch = writeBatch(db);

      // 1. Restar 1 de Tienda Local
      const tiendaDocRef = doc(db, 'inventory', item.id);
      const newQty = item.quantity - 1;
      batch.update(tiendaDocRef, {
        quantity: newQty,
        totalPrice: newQty * unitPrice,
        totalCost: newQty * cost,
        totalValue: newQty * cost,
        lastUpdated: Timestamp.now()
      });

      // 2. Sumar 1 a Bodega Ecuador
      const ecuQ = query(collection(db, 'inventory'), where('productId', '==', productId));
      const ecuSnap = await getDocs(ecuQ);
      const ecuDocs = ecuSnap.docs.filter(d => {
        const loc = String((d.data() as any).location || '').toLowerCase();
        return loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local');
      });

      let newEcuQty = 1;
      if (ecuDocs.length > 0) {
        const ecuDoc = ecuDocs[0];
        const currentEcuQty = Number((ecuDoc.data() as any).quantity) || 0;
        newEcuQty = currentEcuQty + 1;
        batch.update(ecuDoc.ref, {
          quantity: newEcuQty,
          totalPrice: newEcuQty * (prod.salePrice1 || unitPrice),
          totalCost: newEcuQty * cost,
          totalValue: newEcuQty * cost,
          lastUpdated: Timestamp.now()
        });
      } else {
        const newEcuRef = doc(collection(db, 'inventory'));
        batch.set(newEcuRef, {
          productId,
          product: {
            id: productId,
            name: prod.name,
            barcode: prod.barcode || prod.sku || '',
            sku: prod.sku || '',
            imageUrl: prod.imageUrl || '',
            salePrice1: prod.salePrice1 || 0,
            salePrice2: prod.salePrice2 || 0,
            cost: cost
          },
          quantity: 1,
          unitPrice: prod.salePrice1 || unitPrice,
          cost,
          totalPrice: 1 * (prod.salePrice1 || unitPrice),
          totalCost: 1 * cost,
          totalValue: 1 * cost,
          location: 'Bodega Ecuador',
          status: 'stock',
          lastUpdated: Timestamp.now()
        });
      }

      await batch.commit();

      setBodegaEcuadorStockMap(prev => new Map(prev).set(productId, newEcuQty));
      setStoreItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
      toast.success(`-1 unidad retornada a Bodega Ecuador (Quedan ${newQty} en tienda)`);
    } catch (err: any) {
      console.error('Error al restar unidad:', err);
      toast.error('Error al restar unidad');
    }
  };

  // ─── 3. RETORNAR A BODEGA ECUADOR ───────────────────────────────────────────

  const handleOpenReturnModal = (item: StoreProductItem) => {
    setReturningItem(item);
    setReturnQty(Math.min(item.quantity, 1));
  };

  const handleConfirmReturn = async () => {
    if (!returningItem || returnQty <= 0) return;
    if (returnQty > returningItem.quantity) {
      toast.error(`Solo puedes retornar hasta ${returningItem.quantity} unidades`);
      return;
    }

    try {
      setSavingReturn(true);
      const productId = returningItem.productId;
      const prod = returningItem.product;
      const cost = prod.cost || returningItem.cost || 0;
      const unitPrice = returningItem.unitPrice || prod.salePrice1 || 0;

      const batch = writeBatch(db);

      // 1. Restar de Tienda Local
      const tiendaQ = query(collection(db, 'inventory'), where('productId', '==', productId));
      const tiendaSnap = await getDocs(tiendaQ);
      const tiendaDocs = tiendaSnap.docs.filter(d => {
        const loc = String((d.data() as any).location || '').toLowerCase();
        return loc.includes('tienda') || loc.includes('local');
      });

      let remainingToDeduct = returnQty;
      for (const tDoc of tiendaDocs) {
        if (remainingToDeduct <= 0) break;
        const q = Number((tDoc.data() as any).quantity) || 0;
        const deductNow = Math.min(q, remainingToDeduct);
        const newQ = q - deductNow;
        remainingToDeduct -= deductNow;

        if (newQ <= 0) {
          batch.delete(tDoc.ref);
        } else {
          batch.update(tDoc.ref, {
            quantity: newQ,
            totalPrice: newQ * unitPrice,
            totalCost: newQ * cost,
            totalValue: newQ * cost,
            lastUpdated: Timestamp.now()
          });
        }
      }

      // 2. Sumar a Bodega Ecuador
      const ecuDocs = tiendaSnap.docs.filter(d => {
        const loc = String((d.data() as any).location || '').toLowerCase();
        return loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local');
      });

      if (ecuDocs.length > 0) {
        const ecuDoc = ecuDocs[0];
        const currentEcuQty = Number((ecuDoc.data() as any).quantity) || 0;
        const newEcuQty = currentEcuQty + returnQty;
        batch.update(ecuDoc.ref, {
          quantity: newEcuQty,
          totalPrice: newEcuQty * (prod.salePrice1 || unitPrice),
          totalCost: newEcuQty * cost,
          totalValue: newEcuQty * cost,
          lastUpdated: Timestamp.now()
        });
      } else {
        const newEcuRef = doc(collection(db, 'inventory'));
        batch.set(newEcuRef, {
          productId,
          product: {
            id: productId,
            name: prod.name,
            barcode: prod.barcode || prod.sku || '',
            sku: prod.sku || '',
            imageUrl: prod.imageUrl || '',
            salePrice1: prod.salePrice1 || 0,
            salePrice2: prod.salePrice2 || 0,
            cost: cost
          },
          quantity: returnQty,
          unitPrice: prod.salePrice1 || unitPrice,
          cost,
          totalPrice: returnQty * (prod.salePrice1 || unitPrice),
          totalCost: returnQty * cost,
          totalValue: returnQty * cost,
          location: 'Bodega Ecuador',
          status: 'stock',
          lastUpdated: Timestamp.now()
        });
      }

      await batch.commit();

      toast.success(`✓ ${returnQty} unidad(es) de "${prod.name}" retornadas a Bodega Ecuador`);
      setReturningItem(null);
      await loadStoreInventory();
    } catch (err: any) {
      console.error('Error retornando a Bodega Ecuador:', err);
      toast.error(err.message || 'Error al retornar producto a Bodega Ecuador');
    } finally {
      setSavingReturn(false);
    }
  };

  // ─── 4. MODIFICAR STOCK DIRECTO EN TIENDA LOCAL ──────────────────────────────

  const handleOpenAdjustModal = (item: StoreProductItem) => {
    setAdjustingItem(item);
    setAdjustQty(item.quantity);
    setSyncWithBodegaOnAdjust(true);
  };

  const handleConfirmAdjust = async () => {
    if (!adjustingItem || adjustQty < 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }

    try {
      setSavingAdjust(true);
      const productId = adjustingItem.productId;
      const prod = adjustingItem.product;
      const currentQty = adjustingItem.quantity;
      const diff = adjustQty - currentQty; // positivo si aumentó, negativo si disminuyó
      const cost = prod.cost || adjustingItem.cost || 0;
      const unitPrice = adjustingItem.unitPrice || prod.salePrice2 || 0;

      const batch = writeBatch(db);

      // 1. Ajustar en Tienda Local
      const invQ = query(collection(db, 'inventory'), where('productId', '==', productId));
      const invSnap = await getDocs(invQ);

      const tiendaDocs = invSnap.docs.filter(d => {
        const loc = String((d.data() as any).location || '').toLowerCase();
        return loc.includes('tienda') || loc.includes('local');
      });

      if (tiendaDocs.length > 0) {
        if (adjustQty === 0) {
          tiendaDocs.forEach(d => batch.delete(d.ref));
        } else {
          // Asignar adjustQty al primer documento y borrar duplicados si los hubiera
          batch.update(tiendaDocs[0].ref, {
            quantity: adjustQty,
            totalPrice: adjustQty * unitPrice,
            totalCost: adjustQty * cost,
            totalValue: adjustQty * cost,
            lastUpdated: Timestamp.now()
          });
          tiendaDocs.slice(1).forEach(d => batch.delete(d.ref));
        }
      }

      // 2. Si se desea sincronizar diferencia con Bodega Ecuador
      if (syncWithBodegaOnAdjust && diff !== 0) {
        const ecuDocs = invSnap.docs.filter(d => {
          const loc = String((d.data() as any).location || '').toLowerCase();
          return loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local');
        });

        if (diff < 0) {
          // Disminuyó en tienda -> Retornar sobrantes a Bodega Ecuador
          const returnAmt = Math.abs(diff);
          if (ecuDocs.length > 0) {
            const currentEcuQty = Number((ecuDocs[0].data() as any).quantity) || 0;
            batch.update(ecuDocs[0].ref, {
              quantity: currentEcuQty + returnAmt,
              lastUpdated: Timestamp.now()
            });
          } else {
            const newEcuRef = doc(collection(db, 'inventory'));
            batch.set(newEcuRef, {
              productId,
              product: prod,
              quantity: returnAmt,
              cost,
              unitPrice: prod.salePrice1 || unitPrice,
              location: 'Bodega Ecuador',
              status: 'stock',
              lastUpdated: Timestamp.now()
            });
          }
        } else if (diff > 0) {
          // Aumentó en tienda -> Descontar de Bodega Ecuador si hay stock
          if (ecuDocs.length > 0) {
            const currentEcuQty = Number((ecuDocs[0].data() as any).quantity) || 0;
            batch.update(ecuDocs[0].ref, {
              quantity: Math.max(0, currentEcuQty - diff),
              lastUpdated: Timestamp.now()
            });
          }
        }
      }

      await batch.commit();

      toast.success(`✓ Stock de "${prod.name}" ajustado a ${adjustQty} unidades`);
      setAdjustingItem(null);
      await loadStoreInventory();
    } catch (err: any) {
      console.error('Error ajustando stock:', err);
      toast.error(err.message || 'Error al ajustar stock');
    } finally {
      setSavingAdjust(false);
    }
  };

  // ─── 5. QUITAR DE TIENDA LOCAL COMPLETAMENTE ─────────────────────────────────

  const handleRemoveFromTienda = async (item: StoreProductItem) => {
    const returnToBodegaFirst = window.confirm(
      `¿Deseas retornar las ${item.quantity} unidades de "${item.product.name}" a Bodega Ecuador antes de quitarlo de Tienda Local?\n\n` +
      `• Pulsa ACEPTAR para devolver las ${item.quantity} unidades a Bodega Ecuador y quitarlo de la tienda.\n` +
      `• Pulsa CANCELAR si solo querías revisar o cancelar la acción.`
    );
    if (!returnToBodegaFirst) {
      const confirmDirectDelete = window.confirm(
        `¿Estás seguro de que deseas ELIMINAR "${item.product.name}" de Tienda Local SIN enviarlo a Bodega Ecuador?\n(Esta acción eliminará el registro de inventario)`
      );
      if (!confirmDirectDelete) return;
    }

    try {
      const productId = item.productId;
      const prod = item.product;
      const cost = prod.cost || item.cost || 0;
      const unitPrice = item.unitPrice || prod.salePrice1 || 0;

      const q = query(collection(db, 'inventory'), where('productId', '==', productId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);

      // 1. Eliminar de Tienda Local
      snap.docs.forEach(d => {
        const loc = String((d.data() as any).location || '').toLowerCase();
        if (loc.includes('tienda') || loc.includes('local')) {
          batch.delete(d.ref);
        }
      });

      // 2. Si eligió retornar a Bodega Ecuador:
      if (returnToBodegaFirst) {
        const ecuDocs = snap.docs.filter(d => {
          const loc = String((d.data() as any).location || '').toLowerCase();
          return loc.includes('ecuador') && !loc.includes('tienda') && !loc.includes('local');
        });

        if (ecuDocs.length > 0) {
          const currentEcuQty = Number((ecuDocs[0].data() as any).quantity) || 0;
          batch.update(ecuDocs[0].ref, {
            quantity: currentEcuQty + item.quantity,
            totalCost: (currentEcuQty + item.quantity) * cost,
            totalValue: (currentEcuQty + item.quantity) * cost,
            lastUpdated: Timestamp.now()
          });
        } else {
          const newRef = doc(collection(db, 'inventory'));
          batch.set(newRef, {
            productId,
            product: prod,
            quantity: item.quantity,
            unitPrice,
            cost,
            totalPrice: item.quantity * unitPrice,
            totalCost: item.quantity * cost,
            totalValue: item.quantity * cost,
            location: 'Bodega Ecuador',
            status: 'stock',
            lastUpdated: Timestamp.now()
          });
        }
      }

      await batch.commit();

      if (returnToBodegaFirst) {
        toast.success(`"${prod.name}" quitado de tienda y ${item.quantity} unidades devueltas a Bodega Ecuador`);
      } else {
        toast.success(`"${prod.name}" retirado de Tienda Local`);
      }
      await loadStoreInventory();
    } catch (err: any) {
      console.error('Error retirando producto:', err);
      toast.error('Error al retirar producto de Tienda Local');
    }
  };

  // ─── FILTROS Y BÚSQUEDA ──────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const set = new Set<string>();
    storeItems.forEach(i => {
      if (i.product.category) set.add(i.product.category);
    });
    return ['all', ...Array.from(set).sort()];
  }, [storeItems]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    storeItems.forEach(i => {
      if (i.product.brand && i.product.brand.trim()) set.add(i.product.brand.trim());
    });
    return ['all', ...Array.from(set).sort()];
  }, [storeItems]);

  const filteredItems = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanNoLeading = cleanSearch.replace(/^0+/, '');

    return storeItems.filter(item => {
      const p = item.product;
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();

      const matchesSearch =
        !cleanSearch ||
        name.includes(cleanSearch) ||
        sku.includes(cleanSearch) ||
        barcode.includes(cleanSearch) ||
        brand.includes(cleanSearch) ||
        (cleanNoLeading && (sku.replace(/^0+/, '').includes(cleanNoLeading) || barcode.replace(/^0+/, '').includes(cleanNoLeading)));

      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [storeItems, searchTerm, selectedCategory, selectedBrand]);

  // Lista filtrada para modal de agregar producto
  const filteredCatalogToAdd = useMemo(() => {
    if (!addProductSearch.trim()) return allCatalogProducts.slice(0, 15);
    const q = addProductSearch.trim().toLowerCase();
    return allCatalogProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      return name.includes(q) || sku.includes(q) || barcode.includes(q) || brand.includes(q);
    }).slice(0, 20);
  }, [allCatalogProducts, addProductSearch]);

  const totalDistinct = filteredItems.length;
  const totalUnits = filteredItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalValuation = filteredItems.reduce((sum, i) => {
    const price = i.product.salePrice2 || i.product.pvp || i.product.salePrice1 || 0;
    return sum + (price * i.quantity);
  }, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tienda Local</h1>
              <p className="text-emerald-100 text-sm">
                Control de inventario físico en mostrador y vitrina para venta
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón principal para agregar productos directamente */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-sm sm:text-base rounded-2xl shadow-xl active:scale-95 transition-all"
            title="Agregar un perfume o producto a Tienda Local"
          >
            <Plus className="w-6 h-6 text-slate-900 stroke-[3]" />
            <span>+ Agregar Perfumes a Tienda</span>
          </button>

          <button
            onClick={() => window.open('/puntodeventa', '_blank')}
            className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-800 font-bold rounded-2xl shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <span>Abrir POS Tienda</span>
            <ExternalLink className="w-4 h-4 text-emerald-500" />
          </button>

          <button
            onClick={() => navigate('/local-receipts')}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-950/40 border border-white/20 hover:bg-emerald-950/60 text-white font-semibold rounded-2xl backdrop-blur-md active:scale-95 transition-all"
          >
            <PackageCheck className="w-5 h-5 text-emerald-200" />
            <span>Notas de Traslado</span>
          </button>

          <button
            onClick={loadStoreInventory}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 text-white transition-all active:scale-95"
            title="Actualizar stock"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Productos en Tienda</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-1">{totalDistinct}</p>
            <p className="text-xs text-slate-500 mt-0.5">variedades en mostrador</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Package className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unidades Disponibles</p>
            <p className="text-3xl font-extrabold text-teal-600 mt-1">{totalUnits}</p>
            <p className="text-xs text-slate-500 mt-0.5">unidades listas para vender</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Layers className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valorización Tienda</p>
            <p className="text-3xl font-extrabold text-slate-800 mt-1">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">a precio tienda local (PVP)</p>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU, código de barras o marca..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas las Categorías</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas las Marcas</option>
            {brands.filter(b => b !== 'all').map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium text-sm">Cargando inventario de Tienda Local...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No se encontraron productos</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              No hay productos en Tienda Local con los filtros actuales. Puedes agregar perfumes con el botón <strong>"+ Agregar Producto a Tienda"</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Producto</th>
                  <th className="py-4 px-4">Categoría / Marca</th>
                  <th className="py-4 px-4">Código / SKU</th>
                  <th className="py-4 px-4 text-center">Stock Tienda</th>
                  <th className="py-4 px-4 text-right">Precio Tienda</th>
                  <th className="py-4 px-4 text-right">Mayorista</th>
                  <th className="py-4 px-6 text-center">Acciones / Mover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const p = item.product;
                  const img = p.imageUrl || (Array.isArray(p.images) && p.images[0]) || '/logo_falconi.png';
                  const storePrice = p.salePrice2 || p.pvp || p.salePrice1 || 0;
                  const wholesalePrice = p.salePrice1 || 0;
                  const ecStock = bodegaEcuadorStockMap.get(item.productId) || 0;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Producto & Foto */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setPreviewImage(img)}
                            className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 cursor-pointer group relative shadow-sm"
                          >
                            <img
                              src={img}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm line-clamp-1">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                                Tienda Local
                              </span>
                              {ecStock > 0 && (
                                <span className="font-medium text-slate-500 text-[10px]">
                                  ({ecStock} en Bodega Ecuador)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Categoría / Marca */}
                      <td className="py-4 px-4">
                        <p className="text-sm font-semibold text-slate-700">{p.brand || 'Falconi'}</p>
                        <p className="text-xs text-slate-400">{p.category || 'Perfumes'}</p>
                      </td>

                      {/* Código / SKU */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-mono font-medium text-slate-600 flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-normal">SKU:</span>
                            {p.sku || '-'}
                          </p>
                          {p.barcode && p.barcode !== p.sku && (
                            <p className="text-xs font-mono text-slate-500 flex items-center gap-1">
                              <ScanLine className="w-3.5 h-3.5 text-slate-400" />
                              {p.barcode}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Stock Tienda (Controles directos + y - para agregar/quitar, y botón modificar) */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                            <button
                              onClick={() => handleQuickSubtractOne(item)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-800 font-bold border border-slate-200 transition active:scale-90 shadow-sm"
                              title="Quitar 1 unidad y retornar a Bodega Ecuador"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenAdjustModal(item)}
                              className="px-3 py-1 rounded-xl text-sm font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-95 shadow-sm"
                              title="Click para escribir cualquier cantidad física"
                            >
                              <span>{item.quantity}</span> <span className="text-[11px] font-normal opacity-90">uds</span>
                            </button>

                            <button
                              onClick={() => handleQuickAddOne(item)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl bg-white hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-bold border border-slate-200 transition active:scale-90 shadow-sm"
                              title="Sumar 1 unidad a Tienda Local"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                          >
                            <Edit3 className="w-2.5 h-2.5" /> Modificar
                          </button>
                        </div>
                      </td>

                      {/* Precios */}
                      <td className="py-4 px-4 text-right">
                        <p className="text-sm font-bold text-slate-900">${storePrice.toFixed(2)}</p>
                        {p.pvp && p.pvp !== storePrice && (
                          <p className="text-[11px] text-slate-400">PVP: ${p.pvp.toFixed(2)}</p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <p className="text-sm font-medium text-slate-600">${wholesalePrice.toFixed(2)}</p>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botón Retornar a Bodega Ecuador */}
                          <button
                            onClick={() => handleOpenReturnModal(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                            title="Retornar a Bodega Ecuador"
                          >
                            <Undo2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Retornar a Bodega</span>
                          </button>

                          {/* Quitar de Tienda */}
                          <button
                            onClick={() => handleRemoveFromTienda(item)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                            title="Quitar de Tienda Local"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Quitar</span>
                          </button>

                          {/* Editar Precios (secundario) */}
                          <button
                            onClick={() => handleOpenEditPrice(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Editar Precios (Opcional)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL: AGREGAR PRODUCTO A TIENDA LOCAL ─────────────────────────── */}
      {showAddModal && (
        <div
          onClick={() => !savingAdd && setShowAddModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-700 rounded-2xl">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    Agregar Producto / Perfume a Tienda Local
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecciona un producto del catálogo para ingresar a mostrador
                  </p>
                </div>
              </div>
              <button
                disabled={savingAdd}
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador de productos */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Buscar Perfume o Producto
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Escribe el nombre, código o marca..."
                  value={addProductSearch}
                  onChange={e => setAddProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Lista desplegable de selección */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50">
                {filteredCatalogToAdd.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No se encontraron productos coincidentes</p>
                ) : (
                  filteredCatalogToAdd.map(p => {
                    const isSelected = selectedProductToAdd?.id === p.id;
                    const ecStock = bodegaEcuadorStockMap.get(p.id) || 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductToAdd(p)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-100 border-l-4 border-amber-500' : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.imageUrl || '/logo_falconi.png'}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-xl bg-white border"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{p.name}</p>
                            <p className="text-[11px] text-slate-500">
                              SKU: {p.sku || '-'} | Bodega Ecuador: <strong className={ecStock > 0 ? 'text-emerald-600' : 'text-slate-400'}>{ecStock} uds</strong>
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-amber-600 shrink-0 ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detalles de ingreso */}
            {selectedProductToAdd && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">{selectedProductToAdd.name}</span>
                    <span className="text-[11px] text-amber-700">
                      Precio Tienda: ${Number(selectedProductToAdd.salePrice2 || selectedProductToAdd.salePrice1 || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-500 block">En Bodega Ecuador:</span>
                    <span className="font-bold text-slate-800">
                      {bodegaEcuadorStockMap.get(selectedProductToAdd.id) || 0} unidades
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cantidad a ingresar a Tienda:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={addQty}
                      onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl font-bold text-center text-lg"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={deductFromBodega}
                        onChange={e => setDeductFromBodega(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                      />
                      <span>¿Descontar de Bodega Ecuador?</span>
                    </label>
                    <p className="text-[10px] text-slate-400 pl-6 mt-0.5">
                      Resta las unidades de Bodega Ecuador al ingresarlas a Tienda.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={savingAdd}
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedProductToAdd || savingAdd}
                onClick={handleConfirmAddProduct}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded-xl shadow-lg active:scale-95 transition disabled:opacity-40"
              >
                {savingAdd ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Ingresar a Tienda Local</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RETORNAR A BODEGA ECUADOR ───────────────────────────────── */}
      {returningItem && (
        <div
          onClick={() => !savingReturn && setReturningItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-700 rounded-2xl">
                  <Undo2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Retornar a Bodega Ecuador</h3>
                  <p className="text-xs text-slate-500">Mueve stock de mostrador de vuelta a bodega</p>
                </div>
              </div>
              <button
                disabled={savingReturn}
                onClick={() => setReturningItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={returningItem.product.imageUrl || '/logo_falconi.png'}
                  alt={returningItem.product.name}
                  className="w-12 h-12 object-cover rounded-xl bg-white border"
                />
                <div>
                  <p className="font-bold text-sm text-slate-800">{returningItem.product.name}</p>
                  <p className="text-xs text-slate-400">SKU: {returningItem.product.sku}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                <span>Disponible en Tienda Local:</span>
                <span className="font-bold text-emerald-700">{returningItem.quantity} unidades</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Stock actual en Bodega Ecuador:</span>
                <span className="font-bold text-slate-700">
                  {bodegaEcuadorStockMap.get(returningItem.productId) || 0} unidades
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Cantidad a retornar a Bodega Ecuador:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max={returningItem.quantity}
                  value={returnQty}
                  onChange={e => setReturnQty(Math.min(returningItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-center text-lg text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setReturnQty(returningItem.quantity)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Retornar Todo ({returningItem.quantity})
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={savingReturn}
                onClick={() => setReturningItem(null)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={savingReturn}
                onClick={handleConfirmReturn}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm rounded-xl shadow-lg active:scale-95 transition"
              >
                {savingReturn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Retornando...</span>
                  </>
                ) : (
                  <>
                    <Undo2 className="w-4 h-4" />
                    <span>Confirmar Retorno ({returnQty})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: MODIFICAR STOCK FÍSICO EN TIENDA LOCAL ───────────────────── */}
      {adjustingItem && (
        <div
          onClick={() => !savingAdjust && setAdjustingItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-700 rounded-2xl">
                  <ArrowUpDown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Modificar Stock en Tienda</h3>
                  <p className="text-xs text-slate-500">Ajusta la cantidad física en mostrador</p>
                </div>
              </div>
              <button
                disabled={savingAdjust}
                onClick={() => setAdjustingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <p className="font-bold text-sm text-slate-800">{adjustingItem.product.name}</p>
              <p className="text-xs text-slate-500">
                Stock actual en mostrador: <strong className="text-emerald-700">{adjustingItem.quantity} unidades</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nueva cantidad física en Tienda:
              </label>
              <input
                type="number"
                min="0"
                value={adjustQty}
                onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-center text-2xl text-slate-900"
              />
              {adjustQty === 0 && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Si dejas en 0, se quitará de la vitrina de Tienda Local.
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={syncWithBodegaOnAdjust}
                  onChange={e => setSyncWithBodegaOnAdjust(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>Sincronizar diferencia con Bodega Ecuador</span>
              </label>
              <p className="text-[10px] text-slate-400 pl-6 mt-0.5">
                Si reduces stock en tienda, los sobrantes se sumarán automáticamente a Bodega Ecuador.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={savingAdjust}
                onClick={() => setAdjustingItem(null)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={savingAdjust}
                onClick={handleConfirmAdjust}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg active:scale-95 transition"
              >
                {savingAdjust ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Stock ({adjustQty})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL VISTA PREVIA IMAGEN GRANDE ─────────────────────────────────── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-slate-900 rounded-3xl p-4 max-w-lg w-full border border-slate-700 shadow-2xl"
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Producto"
              className="w-full h-96 object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* ─── MODAL EDITAR PRECIOS DEL PRODUCTO ───────────────────────────────── */}
      {editingItem && (
        <div
          onClick={() => !savingPrices && setEditingItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                  <img
                    src={editingItem.product.imageUrl || '/logo_falconi.png'}
                    alt={editingItem.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg line-clamp-1">
                    {editingItem.product.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    SKU: <span className="font-mono text-slate-600">{editingItem.product.sku}</span> | Marca: {editingItem.product.brand || 'Falconi'}
                  </p>
                </div>
              </div>
              <button
                disabled={savingPrices}
                onClick={() => setEditingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario de Precios */}
            <form onSubmit={handleSavePrices} className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-1">
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Precio Tienda / Minorista (salePrice2) *
                </label>
                <p className="text-[11px] text-emerald-600 mb-1.5">
                  Precio de mostrador y POS para venta local.
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice2}
                    onChange={e => setEditPrice2(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Precio PVP (Etiqueta)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPvp}
                      onChange={e => setEditPvp(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                  <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider">
                    Precio Mayorista (salePrice1) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editPrice1}
                      onChange={e => setEditPrice1(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Costo de Compra
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editCost}
                    onChange={e => setEditCost(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] text-blue-700 flex items-start gap-2">
                <span className="font-bold">Nota:</span>
                <span>Al guardar, estos precios se actualizarán en el catálogo maestro y en todos los inventarios (Tienda Local, Bodega Ecuador y Bodega USA).</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={savingPrices}
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPrices}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  {savingPrices ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Actualizando en todo el sistema...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Precios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreEcuador;
