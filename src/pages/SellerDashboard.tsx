import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Banknote,
  CheckCircle,
  Clock,
  User,
  BarChart3,
  Plus,
  Eye,
  FileText,
  Truck,
  Receipt,
  LogOut,
  X,
  Trash2,
  Store,
  ExternalLink,
  Edit,
  Save,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { sellerService } from '../services/sellerService';
import { productService } from '../services/productService';
import { soldProductService, SoldProduct } from '../services/soldProductService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { inventoryService } from '../services/inventoryService';
import { orderService, Order, OrderItem } from '../services/orderService';
import { exitNoteService } from '../services/exitNoteService';
import { ExitNote } from '../types';
import { paymentNoteService } from '../services/paymentNoteService';
import { shippingService, ShippingPackage } from '../services/shippingService';
import { sellerStoreService, StoreProduct } from '../services/sellerStoreService';
import { returnService } from '../services/returnService';
import { Return, ReturnItem } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

// Función que sincroniza inventario considerando notas de salida y ventas realizadas
const syncSellerInventory = async (sellerId: string, exitNotes: ExitNote[], soldProducts: any[]) => {
  try {
    console.log(`Sincronizando inventario para vendedor ${sellerId}`);
    console.log(`Notas de salida: ${exitNotes.length}, Ventas realizadas: ${soldProducts.length}`);

    // PASO 1: Obtener inventario actual y devoluciones aprobadas
    const currentInventory = await sellerInventoryService.getBySeller(sellerId);
    const approvedReturns = await returnService.getBySeller(sellerId);
    const approvedReturnsItems = approvedReturns
      .filter(r => r.status === 'approved')
      .flatMap(r => r.items);

    // Crear mapa de productos devueltos por productId
    const returnedMap = new Map<string, number>();
    for (const returnItem of approvedReturnsItems) {
      const current = returnedMap.get(returnItem.productId) || 0;
      returnedMap.set(returnItem.productId, current + returnItem.quantity);
    }

    console.log(`Productos devueltos encontrados: ${returnedMap.size}`);

    // PASO 2: Crear inventario desde las notas de salida
    const inventoryMap = new Map();

    // Primero, agregar todos los productos de las notas de salida
    for (const note of exitNotes) {
      for (const item of note.items) {
        if (inventoryMap.has(item.productId)) {
          // Sumar cantidad si ya existe
          const existing = inventoryMap.get(item.productId);
          existing.quantity += item.quantity;
          // Mantener el precio unitario (debería ser el mismo para el mismo producto)
          existing.unitPrice = item.unitPrice || existing.unitPrice;
          // Recalcular el valor total
          existing.totalValue = existing.unitPrice * existing.quantity;
        } else {
          // Crear nuevo producto
          const unitPrice = item.unitPrice || 0;
          const returnedQty = returnedMap.get(item.productId) || 0;
          inventoryMap.set(item.productId, {
            sellerId: sellerId,
            productId: item.productId,
            product: item.product,
            quantity: item.quantity,
            unitPrice: unitPrice,
            totalValue: unitPrice * item.quantity,
            status: note.status === 'delivered' || note.status === 'received' ? 'stock' : 'in-transit',
            returnedQuantity: returnedQty // Preservar cantidad devuelta
          });
        }
      }
    }

    // PASO 3: Restar las ventas realizadas
    for (const sale of soldProducts) {
      if (inventoryMap.has(sale.productId)) {
        const existing = inventoryMap.get(sale.productId);
        existing.quantity -= sale.quantity;
        // Recalcular el valor total después de restar la venta
        existing.totalValue = existing.unitPrice * existing.quantity;
        console.log(`Restando venta: ${sale.product.name} - ${sale.quantity} unidades. Stock restante: ${existing.quantity}`);
      }
    }

    // PASO 4: Actualizar o crear productos en el inventario (sin eliminar todo)
    const inventoryItems = Array.from(inventoryMap.values());

    for (const newItem of inventoryItems) {
      // Buscar si ya existe este producto en el inventario actual
      const existingItem = currentInventory.find(
        inv => inv.productId === newItem.productId && inv.sellerId === sellerId
      );

      // Actualizar el estado basándose en la cantidad final
      if (newItem.quantity <= 0) {
        newItem.status = 'delivered';
      }

      // Asegurar que lastDeliveryDate existe
      if (!newItem.lastDeliveryDate) {
        // Buscar la fecha de la última nota de salida para este producto
        const latestNote = exitNotes
          .filter(note => note.items.some(i => i.productId === newItem.productId))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        newItem.lastDeliveryDate = latestNote ? new Date(latestNote.date) : new Date();
      }

      if (existingItem) {
        // Actualizar producto existente preservando returnedQuantity
        // Usar el máximo entre el existente y el calculado desde devoluciones
        const existingReturnedQty = existingItem.returnedQuantity || 0;
        const calculatedReturnedQty = newItem.returnedQuantity || 0;
        const finalReturnedQty = Math.max(existingReturnedQty, calculatedReturnedQty);

        await sellerInventoryService.update(existingItem.id, {
          quantity: newItem.quantity,
          unitPrice: newItem.unitPrice,
          totalValue: newItem.totalValue,
          status: newItem.status,
          product: newItem.product,
          returnedQuantity: finalReturnedQty
        });
      } else {
        // Crear nuevo producto solo si no existe
        await sellerInventoryService.create(newItem);
      }
    }

    // PASO 5: Eliminar productos que ya no están en las notas de salida (opcional, comentado para evitar problemas)
    // Solo eliminar si realmente no deberían estar ahí

    console.log(`Inventario sincronizado: ${inventoryItems.length} productos únicos`);
  } catch (error) {
    console.error('Error sincronizando inventario:', error);
  }
};

// Función para limpiar inventario duplicado del vendedor
const cleanDuplicateInventory = async (sellerId: string) => {
  try {
    console.log(`Limpiando inventario duplicado para vendedor ${sellerId}`);

    const inventory = await sellerInventoryService.getBySeller(sellerId);
    const seenProducts = new Set();
    const duplicatesToDelete = [];

    for (const item of inventory) {
      const key = `${item.productId}-${item.sellerId}`;
      if (seenProducts.has(key)) {
        duplicatesToDelete.push(item.id);
        console.log(`Marcando para eliminar duplicado: ${item.productId}`);
      } else {
        seenProducts.add(key);
      }
    }

    // Eliminar duplicados
    for (const id of duplicatesToDelete) {
      await sellerInventoryService.delete(id);
      console.log(`Eliminado duplicado: ${id}`);
    }

    console.log(`Limpiados ${duplicatesToDelete.length} duplicados`);
  } catch (error) {
    console.error('Error limpiando inventario duplicado:', error);
  }
};

interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  priceType?: 'price1' | 'price2';
  isActive: boolean;
  slug?: string;
}

interface SellerInventoryItem {
  id: string;
  sellerId: string;
  productId: string;
  product: any;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  status: 'stock' | 'in-transit' | 'delivered';
  lastDeliveryDate: Date;
  exitNoteId?: string;
  returnedQuantity?: number; // Cantidad devuelta (productos marcados como devueltos)
}


const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id: sellerIdParam } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isSeller, loading: authLoading } = useAuth();
  const previewMode = searchParams.get('mode');
  const isAdminPreview = Boolean(previewMode === 'admin' && sellerIdParam && isAdmin);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sellerInventory, setSellerInventory] = useState<SellerInventoryItem[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [exitNotes, setExitNotes] = useState<ExitNote[]>([]);
  const [shippingPackages, setShippingPackages] = useState<ShippingPackage[]>([]);
  const [paymentNotes, setPaymentNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [partialPaymentAmount, setPartialPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_deposit'>('cash');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Estados para modal de generar pedido
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [adminInventory, setAdminInventory] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [showOrderFile, setShowOrderFile] = useState(false);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [editingOrderItems, setEditingOrderItems] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [showCounterOrderModal, setShowCounterOrderModal] = useState(false);
  const [selectedCounterOrder, setSelectedCounterOrder] = useState<Order | null>(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingExitNote, setViewingExitNote] = useState<ExitNote | null>(null);
  const [viewingShippingPackage, setViewingShippingPackage] = useState<ShippingPackage | null>(null);
  const [viewingPaymentNote, setViewingPaymentNote] = useState<any | null>(null);
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [viewingProductImage, setViewingProductImage] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState({
    productId: '',
    quantity: 1,
    paymentType: 'credit' as 'credit' | 'cash',
    notes: ''
  });
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [editingStoreProduct, setEditingStoreProduct] = useState<{ productId: string; salePrice: number; description: string } | null>(null);
  const [showStorePreview, setShowStorePreview] = useState(false);
  const [selectedStoreProduct, setSelectedStoreProduct] = useState<StoreProduct | null>(null);
  const [returns, setReturns] = useState<Return[]>([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState<Array<{ productId: string; product: any; quantity: number; unitPrice: number; reason?: string }>>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [viewingReturn, setViewingReturn] = useState<Return | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      console.log('🔐 Estado de autenticación:', { user, isAdmin, isSeller, isAdminPreview, loading });

      if (!user && !isAdminPreview) {
        console.log('❌ Usuario no autenticado');
        setSeller(null);
        setLoading(false);
        return;
      }

      let currentSeller: Seller | null = null;

      if (isAdminPreview) {
        console.log('👀 Vista previa de administrador para vendedor:', sellerIdParam);
        if (!sellerIdParam) {
          toast.error('ID de vendedor no proporcionado');
          setLoading(false);
          return;
        }
        const sellerData = await sellerService.getById(sellerIdParam);
        if (!sellerData) {
          toast.error('Vendedor no encontrado');
          setSeller(null);
          setLoading(false);
          return;
        }
        currentSeller = sellerData;
        setSeller(sellerData);
      } else {
        const sellers = await sellerService.getAll();
        console.log('🔍 Todos los vendedores:', sellers.map(s => ({ id: s.id, email: s.email, name: s.name })));
        console.log('👤 Usuario actual:', user?.email);

        let foundSeller = sellers.find(s => s.email === user?.email);
        console.log('✅ Vendedor encontrado:', foundSeller ? 'SÍ' : 'NO');

        if (foundSeller && !foundSeller.slug) {
          try {
            console.log('🔄 Generando slug para vendedor:', foundSeller.name);
            await sellerService.generateMissingSlugs();
            const updatedSeller = await sellerService.getById(foundSeller.id);
            if (updatedSeller) {
              foundSeller = updatedSeller;
              console.log('✅ Slug generado:', updatedSeller.slug);
            }
          } catch (error) {
            console.error('Error generating slug:', error);
          }
        }

        if (!foundSeller) {
          console.log('❌ No se encontró vendedor para email:', user?.email);

          if (user?.email === 'luisuf@gmail.com') {
            console.log('🚀 Creando vendedor Luisuf automáticamente...');
            try {
              const luisufData = {
                name: 'Luisuf',
                email: 'luisuf@gmail.com',
                phone: '+1234567890',
                city: 'Ciudad',
                address: 'Dirección por definir',
                commission: 10,
                priceType: 'price1' as 'price1' | 'price2',
                isActive: true
              };

              const luisufId = await sellerService.create(luisufData);
              console.log('✅ Luisuf creado con ID:', luisufId);

              const updatedSellers = await sellerService.getAll();
              const newCurrentSeller = updatedSellers.find(s => s.email === user?.email);

              if (newCurrentSeller) {
                currentSeller = newCurrentSeller;
                setSeller(newCurrentSeller);
                console.log('✅ Luisuf configurado correctamente');
              } else {
                toast.error('Error al configurar vendedor');
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error('Error creando Luisuf:', error);
              toast.error('Error al crear vendedor');
              setLoading(false);
              return;
            }
          } else {
            toast.error('No tienes permisos de vendedor');
            setLoading(false);
            return;
          }
        } else {
          currentSeller = foundSeller;
          setSeller(foundSeller);
        }
      }

      if (!currentSeller) {
        setLoading(false);
        return;
      }

      const sellerId = currentSeller.id;

      const inventoryData = await sellerInventoryService.getBySeller(sellerId);
      console.log('Inventario del vendedor cargado:', inventoryData);
      setSellerInventory(inventoryData);

      const salesData = await soldProductService.getBySeller(sellerId);
      setSoldProducts(salesData);

      const exitNotesData = await exitNoteService.getAll();
      const sellerExitNotes = exitNotesData.filter(note => note.sellerId === sellerId);
      setExitNotes(sellerExitNotes);

      await syncSellerInventory(sellerId, sellerExitNotes, salesData);

      const updatedInventoryData = await sellerInventoryService.getBySeller(sellerId);
      setSellerInventory(updatedInventoryData);

      const shippingData = await shippingService.getAll();
      const sellerShippingPackages = shippingData.filter(pkg => pkg.sellerId === sellerId);
      console.log('📦 Paquetes del vendedor encontrados:', sellerShippingPackages.length);

      const packagesWithItems = sellerShippingPackages.map(pkg => {
        const associatedExitNote = sellerExitNotes.find(note => note.shippingId === pkg.id);
        console.log(`📦 Paquete ${pkg.id}:`, {
          hasExitNote: !!associatedExitNote,
          itemsCount: associatedExitNote ? associatedExitNote.items.length : 0
        });
        return {
          ...pkg,
          items: associatedExitNote ? associatedExitNote.items : []
        };
      });

      console.log('📦 Paquetes con items:', packagesWithItems);
      setShippingPackages(packagesWithItems);

      const paymentNotesData = await paymentNoteService.getAll();
      const sellerPaymentNotes = paymentNotesData.filter(note => note.sellerId === sellerId);
      setPaymentNotes(sellerPaymentNotes);

      const returnsData = await returnService.getBySeller(sellerId);
      setReturns(returnsData);

      await loadSellerOrders(sellerId);

      const [inventoryDataAdmin, productsData] = await Promise.all([
        inventoryService.getAll(),
        productService.getAll()
      ]);

      const inventoryWithProducts = inventoryDataAdmin.map(item => {
        const product = productsData.find(p => p.id === item.productId);
        return {
          ...item,
          product: product || {} as any
        };
      });

      setAdminInventory(inventoryWithProducts);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
      setLoading(false);
    }
  }, [user, isAdminPreview, sellerIdParam, isAdmin, isSeller]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

  // Cargar pedidos cuando se accede a la sección "Mis Pedidos"
  useEffect(() => {
    if (activeSection === 'my-orders' && seller) {
      loadSellerOrders();
    }
    if (activeSection === 'store' && seller) {
      loadStoreProducts();
    }
    if (activeSection === 'returns' && seller) {
      loadReturns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, seller]);

  const loadReturns = async () => {
    if (!seller) return;
    try {
      const returnsData = await returnService.getBySeller(seller.id);
      setReturns(returnsData);
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Error al cargar las devoluciones');
    }
  };

  const loadStoreProducts = async () => {
    if (!seller) return;
    try {
      const products = await sellerStoreService.getStoreProducts(seller.id);
      setStoreProducts(products);
    } catch (error) {
      console.error('Error loading store products:', error);
      toast.error('Error al cargar productos de la tienda');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const handleProductClick = (item: any) => {
    setSelectedProduct(item);
    setOrderQuantity(1);
    setShowProductModal(true);
  };

  const loadSellerOrders = async (sellerIdOverride?: string) => {
    const targetSellerId = sellerIdOverride ?? seller?.id;
    if (!targetSellerId) {
      console.log('No seller found, cannot load orders');
      return;
    }

    try {
      setLoadingOrders(true);
      console.log('Loading orders for seller:', targetSellerId);
      const orders = await orderService.getBySeller(targetSellerId);
      console.log('Loaded orders:', orders);
      setSellerOrders(orders);
    } catch (error) {
      console.error('Error loading seller orders:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleViewOrder = () => {
    setEditingOrderItems([...orderItems]);
    setShowOrderFile(true);
  };

  const updateOrderItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setEditingOrderItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, orderQuantity: newQuantity }
        : item
    ));
  };

  const removeOrderItem = (itemId: string) => {
    setEditingOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  const saveOrderChanges = () => {
    setOrderItems([...editingOrderItems]);
    setShowOrderFile(false);
    toast.success('Cambios guardados en el pedido');
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrderDetails(order);
    setShowOrderDetailsModal(true);
  };

  const handleViewCounterOrder = (order: Order) => {
    setSelectedCounterOrder(order);
    setShowCounterOrderModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setShowEditOrderModal(true);
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!order.id) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar el pedido #${order.id.slice(-8)}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      await orderService.delete(order.id);
      await loadSellerOrders();
      toast.success('Pedido eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Error al eliminar el pedido');
    }
  };

  const handleAddToOrder = () => {
    if (!selectedProduct) return;

    if (orderQuantity > selectedProduct.quantity) {
      toast.error(`Solo hay ${selectedProduct.quantity} unidades disponibles en stock`);
      return;
    }

    // Verificar si el producto ya está en el pedido
    const existingItem = orderItems.find(item => item.id === selectedProduct.id);

    if (existingItem) {
      // Si ya existe, actualizar la cantidad
      const newQuantity = existingItem.orderQuantity + orderQuantity;
      if (newQuantity > selectedProduct.quantity) {
        toast.error(`Solo hay ${selectedProduct.quantity} unidades disponibles en stock`);
        return;
      }

      setOrderItems(prev => prev.map(item =>
        item.id === selectedProduct.id
          ? { ...item, orderQuantity: newQuantity }
          : item
      ));
    } else {
      // Si no existe, agregarlo
      setOrderItems(prev => [...prev, {
        ...selectedProduct,
        orderQuantity: orderQuantity
      }]);
    }

    toast.success(`Agregado al pedido: ${selectedProduct.product?.name} (${orderQuantity} unidades)`);
    setShowProductModal(false);
  };

  const generateOrder = async () => {
    if (orderItems.length === 0) {
      toast.error('No hay productos en el pedido');
      return;
    }

    if (!seller) {
      toast.error('Error: Información del vendedor no disponible');
      return;
    }

    try {
      const totalAmount = orderItems.reduce((total, item) =>
        total + ((item.product?.salePrice1 || 0) * item.orderQuantity), 0
      );

      const totalQuantity = orderItems.reduce((total, item) => total + item.orderQuantity, 0);

      // Convertir orderItems a OrderItem[]
      const orderItemsData: OrderItem[] = orderItems.map(item => ({
        productId: item.productId || item.id,
        productName: item.product?.name || 'Producto no encontrado',
        sku: item.product?.sku || 'N/A',
        quantity: item.orderQuantity,
        unitPrice: item.product?.salePrice1 || 0,
        subtotal: (item.product?.salePrice1 || 0) * item.orderQuantity,
        location: item.location || 'N/A',
        status: item.status === 'stock' ? 'stock' : 'out_of_stock'
      }));

      // Crear el pedido en Firebase
      const orderData = {
        sellerId: seller.id,
        sellerName: seller.name,
        sellerEmail: seller.email,
        items: orderItemsData,
        totalAmount,
        totalItems: orderItems.length,
        totalQuantity,
        status: 'pending' as const
      };

      const orderId = await orderService.create(orderData);
      console.log('Order created with ID:', orderId);

      // Recargar los pedidos del vendedor
      console.log('Reloading seller orders...');
      await loadSellerOrders();

      // Limpiar el pedido actual
      setOrderItems([]);
      setShowOrderFile(false);

      toast.success(`Pedido #${orderId} creado exitosamente y enviado al administrador`);

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear el pedido');
    }
  };

  const handleDeleteSale = async (saleId: string, productId: string, quantity: number) => {
    try {
      if (!seller) return;

      // Eliminar la venta (pasando el email del usuario para registro)
      await soldProductService.delete(saleId, user?.email || 'unknown');

      // Restaurar la cantidad en el inventario
      const product = sellerInventory.find(item => item.productId === productId);
      if (product) {
        const newQuantity = product.quantity + quantity;
        console.log(`Restaurando inventario: Producto ${product.product.name}, Cantidad actual: ${product.quantity}, Restaurando: ${quantity}, Nueva cantidad: ${newQuantity}`);
        console.log(`ID del producto en inventario: ${product.id}`);

        // Usar el ID del inventario del vendedor, no el productId
        await sellerInventoryService.updateQuantity(product.id, newQuantity);
        console.log('Inventario restaurado exitosamente');
      } else {
        console.error('Producto no encontrado en inventario:', productId);
        toast.error('Error: Producto no encontrado en inventario');
      }

      toast.success('Venta eliminada exitosamente');
      await loadData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error('Error al eliminar la venta');
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('=== INICIANDO VENTA ===');
      console.log('Vendedor:', seller);
      console.log('Formulario de venta:', saleForm);

      if (!seller) return;

      const product = sellerInventory.find(item => item.id === saleForm.productId);
      console.log('Producto encontrado:', product);

      if (!product) {
        toast.error('Producto no encontrado');
        return;
      }

      console.log(`Verificando stock: Disponible: ${product.quantity}, Solicitado: ${saleForm.quantity}`);
      if (product.quantity < saleForm.quantity) {
        toast.error('Cantidad insuficiente en inventario');
        return;
      }

      // Obtener precio según el tipo del vendedor
      const unitPrice = seller.priceType === 'price2'
        ? product.product.salePrice2
        : product.product.salePrice1;

      const totalPrice = unitPrice * saleForm.quantity;

      // Crear la venta
      console.log('Creando venta...');
      const saleData = {
        sellerId: seller.id,
        productId: product.productId,
        product: product.product,
        quantity: saleForm.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        saleDate: new Date(),
        createdAt: new Date(),
        paymentType: saleForm.paymentType,
        status: 'pending' as const,
        notes: saleForm.notes
      };
      console.log('Datos de la venta:', saleData);

      await soldProductService.create(saleData);
      console.log('Venta creada exitosamente');

      // Actualizar inventario del vendedor
      const newQuantity = product.quantity - saleForm.quantity;
      console.log(`Actualizando inventario: Producto ${product.product.name}, Cantidad actual: ${product.quantity}, Vendido: ${saleForm.quantity}, Nueva cantidad: ${newQuantity}`);
      console.log(`ID del producto en inventario: ${product.id}`);

      await sellerInventoryService.updateQuantity(
        product.id,
        newQuantity
      );

      console.log('Inventario actualizado exitosamente');
      toast.success('Venta registrada exitosamente');
      setShowSaleModal(false);
      setSaleForm({
        productId: '',
        quantity: 1,
        paymentType: 'credit',
        notes: ''
      });

      // Recargar datos
      console.log('Recargando datos...');
      await loadData();
      console.log('Datos recargados');
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Error al registrar la venta');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'paid':
        return 'Pagado';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Desconocido';
    }
  };

  const getInventoryStatusColor = (status: string, quantity: number = 0) => {
    // Si la cantidad es 0, mostrar como agotado independientemente del estado
    if (quantity <= 0) {
      return 'text-red-600 bg-red-100';
    }

    switch (status) {
      case 'stock':
        return 'text-green-600 bg-green-100';
      case 'in-transit':
        return 'text-blue-600 bg-blue-100';
      case 'delivered':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getInventoryStatusText = (status: string, quantity: number = 0) => {
    // Si la cantidad es 0, mostrar como agotado independientemente del estado
    if (quantity <= 0) {
      return 'Agotado';
    }

    switch (status) {
      case 'stock':
        return 'En Stock';
      case 'in-transit':
        return 'En Tránsito';
      case 'delivered':
        return 'En Camino';
      default:
        return 'Desconocido';
    }
  };

  // Estadísticas (excluyendo productos devueltos)
  const totalInventory = sellerInventory.reduce((sum, item) => {
    const returnedQty = item.returnedQuantity || 0;
    const availableQty = (item.quantity || 0) - returnedQty;
    return sum + Math.max(0, availableQty);
  }, 0);
  const totalSales = soldProducts.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
  const pendingSales = soldProducts.filter(sale => sale.status === 'pending').length;
  const paidSales = soldProducts.filter(sale => sale.status === 'paid').length;
  const totalExitNotes = exitNotes.length;
  const pendingExitNotes = exitNotes.filter(note => note.status === 'pending').length;
  const inTransitExitNotes = exitNotes.filter(note => note.status === 'in-transit').length;
  const deliveredExitNotes = exitNotes.filter(note => note.status === 'delivered').length;
  const totalPaymentNotes = paymentNotes.length;

  // Paquetería en tránsito
  const inTransitPackages = shippingPackages.filter(pkg => pkg.status === 'in-transit').length;

  // Valor total del inventario del vendedor (todos los productos, excluyendo devueltos)
  const currentInventoryValue = sellerInventory.reduce((sum, item) => {
    const returnedQty = item.returnedQuantity || 0;
    const availableQty = (item.quantity || 0) - returnedQty;
    if (availableQty > 0) {
      return sum + ((item.unitPrice || 0) * availableQty);
    }
    return sum;
  }, 0);

  // Valor del inventario del vendedor (suma de precios de productos en su inventario, excluyendo devueltos)
  const availableInventoryValue = sellerInventory
    .reduce((sum, item) => {
      const returnedQty = item.returnedQuantity || 0;
      const availableQty = (item.quantity || 0) - returnedQty;
      if (availableQty <= 0) return sum;

      // Usar el precio de venta del producto del inventario del vendedor
      const productPrice = seller?.priceType === 'price2'
        ? (item.product.salePrice2 || item.product.salePrice1 || 0)
        : (item.product.salePrice1 || 0);

      const subtotal = (productPrice || 0) * availableQty;

      return sum + subtotal;
    }, 0);

  // Calcular deuda actual: Valor inventario - Notas de pago aprobadas
  const approvedPayments = paymentNotes
    .filter(note => note.status === 'approved')
    .reduce((sum, note) => sum + (note.totalAmount || 0), 0);

  const currentDebt = Math.max(0, currentInventoryValue - approvedPayments);

  // Calcular deuda de productos entregados menos devoluciones y pagos
  // 1. Valor de productos de notas de salida entregadas (status 'delivered' o 'received')
  const deliveredExitNotesList = exitNotes.filter(note =>
    note.status === 'delivered' || note.status === 'received'
  );

  const deliveredInventoryValue = deliveredExitNotesList.reduce((sum: number, note: ExitNote) => {
    return sum + (note.totalPrice || 0);
  }, 0);

  // 2. Monto total de devoluciones aprobadas
  const approvedReturnsTotal = returns
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (r.totalValue || 0), 0);

  // 3. Monto total de notas de pago aprobadas
  const approvedPaymentsTotal = paymentNotes
    .filter(note => note.status === 'approved')
    .reduce((sum, note) => sum + (note.totalAmount || 0), 0);

  // 4. Deuda = Valor productos entregados - Devoluciones - Pagos
  const deliveredProductsDebt = Math.max(0, deliveredInventoryValue - approvedReturnsTotal - approvedPaymentsTotal);

  console.log('Valor total del inventario:', availableInventoryValue);
  console.log('Inventario del vendedor:', sellerInventory);
  console.log('Vendedor:', seller);
  console.log('Valor productos entregados:', deliveredInventoryValue);
  console.log('Total devoluciones:', approvedReturnsTotal);
  console.log('Deuda productos entregados:', deliveredProductsDebt);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes permisos de vendedor</h3>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inventario Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalInventory}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900">${(isNaN(totalSales) ? 0 : (totalSales || 0)).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas Pagadas</p>
              <p className="text-2xl font-bold text-gray-900">{paidSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Notas de Salida</p>
              <p className="text-2xl font-bold text-gray-900">{totalExitNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingExitNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En Tránsito</p>
              <p className="text-2xl font-bold text-gray-900">{inTransitExitNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entregadas</p>
              <p className="text-2xl font-bold text-gray-900">{deliveredExitNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Receipt className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Notas de Pago</p>
              <p className="text-2xl font-bold text-gray-900">{totalPaymentNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Truck className="h-6 w-6 text-cyan-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En Tránsito</p>
              <p className="text-2xl font-bold text-gray-900">{inTransitPackages}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Inventario</p>
              <p className="text-2xl font-bold text-gray-900">${(isNaN(availableInventoryValue) ? 0 : (availableInventoryValue || 0)).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tarjeta de Deuda Actual */}
        <div className={`bg-white rounded-lg shadow p-6 border-2 ${currentDebt > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
          }`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${currentDebt > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
              {currentDebt > 0 ? (
                <AlertCircle className="h-6 w-6 text-red-600" />
              ) : (
                <DollarSign className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${currentDebt > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                Deuda Actual
              </p>
              <p className={`text-2xl font-bold ${currentDebt > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                ${currentDebt.toLocaleString()}
              </p>
              {currentDebt > 0 && (
                <p className="text-xs text-red-600 mt-1">Pendiente de pago</p>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta de Deuda Productos Entregados */}
        <div className={`bg-white rounded-lg shadow p-6 border-2 ${deliveredProductsDebt > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'
          }`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${deliveredProductsDebt > 0 ? 'bg-orange-100' : 'bg-green-100'
              }`}>
              {deliveredProductsDebt > 0 ? (
                <AlertCircle className="h-6 w-6 text-orange-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${deliveredProductsDebt > 0 ? 'text-orange-700' : 'text-green-700'
                }`}>
                Deuda Productos Entregados
              </p>
              <p className={`text-2xl font-bold ${deliveredProductsDebt > 0 ? 'text-orange-600' : 'text-green-600'
                }`}>
                ${deliveredProductsDebt.toLocaleString()}
              </p>
              {deliveredProductsDebt > 0 && (
                <p className="text-xs text-orange-600 mt-1">Entregados - Devoluciones</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de ventas recientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Ventas Recientes</h3>
        </div>
        <div className="p-6">
          {soldProducts.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
              <p className="mt-1 text-sm text-gray-500">Tus ventas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {soldProducts.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{sale.product.name}</p>
                      <p className="text-sm text-gray-500">
                        Cantidad: {sale.quantity} |
                        {sale.paymentType === 'credit' ? (
                          <CreditCard className="inline h-4 w-4 ml-1 text-blue-500" />
                        ) : (
                          <Banknote className="inline h-4 w-4 ml-1 text-green-500" />
                        )}
                        {sale.paymentType === 'credit' ? ' Crédito' : ' Efectivo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                      {getStatusText(sale.status)}
                    </span>
                    <span className="text-sm font-medium text-gray-900">${(isNaN(sale.totalPrice) ? 0 : (sale.totalPrice || 0)).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGenerateOrder = () => {
    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Generar Pedido</h2>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Inventario Disponible
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">
                      Instrucciones para generar tu pedido:
                    </h4>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>• <strong>Da clic en la foto o nombre</strong> del producto que deseas agregar</p>
                      <p>• <strong>Selecciona la cantidad</strong> que necesitas (máximo según el stock disponible)</p>
                      <p>• <strong>Haz clic en "Agregar al Pedido"</strong> para incluirlo en tu pedido</p>
                      <p>• <strong>Revisa tu pedido</strong> en la sección inferior antes de finalizar</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleViewOrder}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Ver tu Pedido ({orderItems.length})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="h-12 w-12 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleProductClick(item)}
                        >
                          {item.product?.imageUrl ? (
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={item.product.imageUrl}
                              alt={item.product.name}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
                          onClick={() => handleProductClick(item)}
                        >
                          {item.product?.name || 'Producto no encontrado'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.product?.sku || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.quantity || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.location || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${item.product?.salePrice1?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {item.status === 'stock' ? 'En Stock' : 'Sin Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {adminInventory.length === 0 && (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay inventario disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Sección del Pedido */}
        {orderItems.length > 0 && (
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Mi Pedido ({orderItems.length} productos)
              </h3>

              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {item.product?.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.product?.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.product?.sku}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        Cantidad: {item.orderQuantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        ${((item.product?.salePrice1 || 0) * item.orderQuantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => setOrderItems(prev => prev.filter(orderItem => orderItem.id !== item.id))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total del Pedido:</span>
                    <span className="text-xl font-bold text-primary-600">
                      ${orderItems.reduce((total, item) =>
                        total + ((item.product?.salePrice1 || 0) * item.orderQuantity), 0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMyOrders = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Mis Pedidos</h2>
          <button
            onClick={() => loadSellerOrders()}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors flex items-center"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {loadingOrders ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando pedidos...</p>
          </div>
        ) : sellerOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pedidos</h3>
            <p className="mt-1 text-sm text-gray-500">Tus pedidos aparecerán aquí una vez que los generes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sellerOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white shadow rounded-lg p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Pedido #{order.id?.slice(-8)}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'approved' ? 'bg-green-100 text-green-800' :
                              order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                          }`}>
                          {order.status === 'pending' ? 'Pendiente' :
                            order.status === 'approved' ? 'Aprobado' :
                              order.status === 'rejected' ? 'Rechazado' : 'Completado'}
                        </span>

                        {/* Botones de gestión (solo si está pendiente) */}
                        {order.status === 'pending' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                console.log('Editando pedido:', order);
                                handleEditOrder(order);
                              }}
                              className="bg-yellow-500 text-white p-1.5 rounded hover:bg-yellow-600 transition-colors"
                              title="Editar Pedido"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => {
                                console.log('Borrando pedido:', order);
                                handleDeleteOrder(order);
                              }}
                              className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600 transition-colors"
                              title="Borrar Pedido"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Debug: Mostrar estado del pedido */}
                        <div className="text-xs text-gray-400 mt-1">
                          Estado: {order.status}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      <p>Fecha: {order.createdAt.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                      <p>Total: ${order.totalAmount.toFixed(2)} | Productos: {order.totalItems} | Cantidad: {order.totalQuantity}</p>
                    </div>

                    {order.notes && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Notas del administrador:</strong> {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => handleViewOrderDetails(order)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver Orden
                  </button>

                  <button
                    onClick={() => handleViewCounterOrder(order)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Contra Orden
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderInventory = () => {
    // Calcular el valor actual del inventario (productos existentes, excluyendo devueltos)
    // Usar el unitPrice del inventario del vendedor, no recalcular desde el producto
    const currentInventoryValue = sellerInventory.reduce((sum, item) => {
      if (!item) return sum;
      const returnedQty = item.returnedQuantity || 0;
      const availableQty = (item.quantity || 0) - returnedQty;
      if (availableQty <= 0) return sum; // No contar productos devueltos
      // Usar unitPrice del inventario del vendedor (precio al que se le entregó)
      // Si no existe unitPrice, usar totalValue / quantity, o calcular desde el producto como fallback
      const price = item.unitPrice || (item.totalValue && item.quantity ? item.totalValue / item.quantity : 0);
      return sum + (price * availableQty);
    }, 0);

    // Calcular el valor histórico del inventario (todas las notas de salida recibidas)
    const historicalInventoryValue = exitNotes.reduce((sum, note) => {
      return sum + (note.totalPrice || 0);
    }, 0);

    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mi Inventario</h2>
        </div>

        {/* Resumen de valores del inventario */}
        {sellerInventory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Valor Actual del Inventario</p>
                <p className="text-3xl font-bold text-green-600">${(isNaN(currentInventoryValue) ? 0 : (currentInventoryValue || 0)).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Productos en stock actual</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Valor Histórico del Inventario</p>
                <p className="text-3xl font-bold text-blue-600">${(isNaN(historicalInventoryValue) ? 0 : (historicalInventoryValue || 0)).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Total recibido en notas de salida</p>
              </div>
            </div>
          </div>
        )}

        {sellerInventory.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes productos en inventario</h3>
            <p className="mt-1 text-sm text-gray-500">Los productos aparecerán aquí cuando recibas entregas.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talla</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sellerInventory.map((item, index) => {
                  const returnedQty = item.returnedQuantity || 0;
                  const availableQty = item.quantity - returnedQty;
                  const isReturned = returnedQty > 0;
                  const isFullyReturned = returnedQty >= item.quantity;

                  return (
                    <tr
                      key={item.id}
                      className={`${isFullyReturned ? 'bg-gray-100 opacity-60' : isReturned ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isFullyReturned ? 'text-gray-400' : 'text-gray-900'}`}>
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            {item.product.imageUrl ? (
                              <img
                                className={`h-12 w-12 rounded-lg object-cover ${isFullyReturned ? 'opacity-50 grayscale' : 'cursor-pointer hover:opacity-80 transition-opacity'}`}
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                onClick={isFullyReturned ? undefined : () => setViewingProductImage(item.product.imageUrl)}
                              />
                            ) : (
                              <div className={`h-12 w-12 rounded-lg ${isFullyReturned ? 'bg-gray-300' : 'bg-gray-200'} flex items-center justify-center`}>
                                <Package className={`h-6 w-6 ${isFullyReturned ? 'text-gray-400' : 'text-gray-400'}`} />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className={`text-sm font-medium ${isFullyReturned ? 'text-gray-400' : 'text-gray-900'}`}>
                              {item.product.name}
                              {isFullyReturned && <span className="ml-2 text-xs text-red-600 font-bold">(DEVUELTO)</span>}
                              {isReturned && !isFullyReturned && <span className="ml-2 text-xs text-orange-600 font-semibold">({returnedQty} devuelto{returnedQty > 1 ? 's' : ''})</span>}
                            </div>
                            <div className={`text-sm ${isFullyReturned ? 'text-gray-400' : 'text-gray-500'}`}>SKU: {item.product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isFullyReturned ? 'text-gray-400' : 'text-gray-900'}`}>
                        {item.product.size || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isFullyReturned ? 'text-gray-400' : 'text-gray-900'}`}>
                        {item.product.color || 'N/A'}
                        {item.product.color2 && (
                          <div className={`text-xs ${isFullyReturned ? 'text-gray-400' : 'text-gray-500'}`}>+ {item.product.color2}</div>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isFullyReturned ? 'text-gray-400' : 'text-gray-900'}`}>
                        ${(isNaN(item.unitPrice) ? 0 : (item.unitPrice || 0)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className={isFullyReturned ? 'text-gray-400' : 'text-gray-900'}>
                          {availableQty > 0 ? availableQty : 0}
                          {returnedQty > 0 && (
                            <div className="text-xs text-red-600 font-semibold">
                              (Devuelto: {returnedQty})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isFullyReturned ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                            DEVUELTO
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInventoryStatusColor(item.status, availableQty)}`}>
                            {getInventoryStatusText(item.status, availableQty)}
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isFullyReturned ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(item.lastDeliveryDate).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderSales = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mis Ventas</h2>
        <button
          onClick={() => setShowSaleModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Venta
        </button>
      </div>

      {soldProducts.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
          <p className="mt-1 text-sm text-gray-500">Registra tu primera venta.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {soldProducts.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${sale.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${sale.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.paymentType === 'credit' ? (
                      <span className="flex items-center text-blue-600">
                        <CreditCard className="h-4 w-4 mr-1" />
                        Crédito
                      </span>
                    ) : (
                      <span className="flex items-center text-green-600">
                        <Banknote className="h-4 w-4 mr-1" />
                        Efectivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                      {getStatusText(sale.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      {sale.status === 'pending' && (
                        <button
                          onClick={async () => {
                            try {
                              await soldProductService.update(sale.id, { status: 'paid' });
                              toast.success('Venta marcada como pagada');
                              await loadData();
                            } catch (error) {
                              console.error('Error updating sale status:', error);
                              toast.error('Error al marcar la venta como pagada');
                            }
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Pagado
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de que quieres eliminar esta venta de ${sale.product.name}?`)) {
                            handleDeleteSale(sale.id, sale.productId, sale.quantity);
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderExitNotes = () => {
    // Calcular el total de todas las notas de salida
    const totalExitNotesValue = exitNotes.reduce((sum, note) => sum + (note.totalPrice || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Mis Notas de Salida</h2>
        </div>

        {/* Resumen de totales */}
        {exitNotes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total de Notas</p>
                <p className="text-2xl font-bold text-gray-900">{exitNotes.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">${(totalExitNotesValue || 0).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Promedio por Nota</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${exitNotes.length > 0 ? ((totalExitNotesValue || 0) / exitNotes.length).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>
        )}

        {exitNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de salida</h3>
            <p className="mt-1 text-sm text-gray-500">Las notas de salida aparecerán aquí cuando el administrador las genere.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exitNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {note.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(note.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {note.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{note.items.length} productos</span>
                        <span className="text-xs text-gray-500">
                          {note.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(note.totalPrice || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${note.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : note.status === 'in-transit'
                            ? 'bg-blue-100 text-blue-800'
                            : note.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : note.status === 'received'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                        {note.status === 'delivered' ? 'Entregada' :
                          note.status === 'in-transit' ? 'En Tránsito' :
                            note.status === 'pending' ? 'Pendiente' :
                              note.status === 'received' ? 'Recibida' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setViewingExitNote(note)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderShippingPackages = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mis Paquetes de Envío</h2>
      </div>

      {shippingPackages.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay paquetes de envío</h3>
          <p className="mt-1 text-sm text-gray-500">Los paquetes de envío aparecerán aquí cuando el administrador los genere.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinatario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shippingPackages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pkg.trackingNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(pkg.shippingDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{pkg.recipient}</div>
                    <div className="text-sm text-gray-500">{pkg.city}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {pkg.items && pkg.items.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="relative">
                          {item.product && item.product.imageUrl && (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-8 h-8 rounded object-cover cursor-pointer hover:opacity-75"
                              onClick={() => setViewingProductImage(item.product.imageUrl)}
                            />
                          )}
                        </div>
                      ))}
                      {pkg.items && pkg.items.length > 3 && (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                          +{pkg.items.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{(pkg.weight || 0).toFixed(2)}g</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${(pkg.cost || 0).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pkg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        pkg.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                          pkg.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                      }`}>
                      {pkg.status === 'pending' ? 'Pendiente' :
                        pkg.status === 'in-transit' ? 'En Tránsito' :
                          pkg.status === 'delivered' ? 'En Camino' :
                            'Devuelto'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setViewingShippingPackage(pkg)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPaymentNotes = () => {
    // Calcular la deuda total basada en el valor histórico (todas las notas de salida recibidas)
    const historicalInventoryValue = exitNotes.reduce((sum, note) => {
      return sum + note.totalPrice;
    }, 0);

    // Calcular los pagos realizados (notas de pago aprobadas)
    const approvedPayments = paymentNotes
      .filter(note => note.status === 'approved')
      .reduce((sum, note) => {
        return sum + note.totalAmount;
      }, 0);

    // Calcular la deuda actual (histórico - pagos realizados)
    const currentDebt = historicalInventoryValue - approvedPayments;

    return (
      <div className="space-y-6">
        {/* Información de Deuda */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Deuda Total Actual</h3>
              <p className="text-sm text-blue-700">
                Valor total de tu inventario pendiente de pago
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">
                ${currentDebt.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Histórico: ${historicalInventoryValue.toFixed(2)} - Pagos: ${approvedPayments.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Mis Notas de Pago</h2>
          <button
            onClick={() => {
              setPaymentType('full');
              setPartialPaymentAmount(0);
              setShowPaymentModal(true);
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Nota de Pago
          </button>
        </div>

        {paymentNotes.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de pago</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primera nota de pago para reportar pagos a la empresa.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {note.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(note.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${note.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : note.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {note.status === 'approved' ? 'Aprobada' :
                          note.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setViewingPaymentNote(note)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const handleAddToStore = async (item: SellerInventoryItem, salePrice: number, description: string) => {
    if (!seller) return;

    if (!salePrice || salePrice <= 0) {
      toast.error('Por favor ingresa un precio válido');
      return;
    }

    try {
      await sellerStoreService.addProductToStore(
        seller.id,
        item.productId,
        item.product,
        salePrice,
        description
      );
      await loadStoreProducts();
      setEditingStoreProduct(null);
      toast.success('Producto agregado a la tienda');
    } catch (error) {
      console.error('Error adding product to store:', error);
      toast.error('Error al agregar producto a la tienda');
    }
  };

  const handleToggleStoreProduct = async (productId: string, isActive: boolean) => {
    try {
      await sellerStoreService.toggleProductActive(productId, !isActive);
      await loadStoreProducts();
    } catch (error) {
      console.error('Error toggling product:', error);
      toast.error('Error al actualizar producto');
    }
  };

  const handleRemoveFromStore = async (productId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto de la tienda?')) {
      try {
        await sellerStoreService.removeProductFromStore(productId);
        await loadStoreProducts();
      } catch (error) {
        console.error('Error removing product:', error);
        toast.error('Error al eliminar producto');
      }
    }
  };

  const renderReturns = () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending':
          return 'bg-yellow-100 text-yellow-800';
        case 'approved':
          return 'bg-green-100 text-green-800';
        case 'rejected':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending':
          return 'Pendiente';
        case 'approved':
          return 'Aprobada';
        case 'rejected':
          return 'Rechazada';
        default:
          return status;
      }
    };

    const handleAddReturnItem = () => {
      const availableProducts = sellerInventory.filter(item => item.quantity > 0);
      if (availableProducts.length === 0) {
        toast.error('No hay productos disponibles en tu inventario');
        return;
      }
      setShowReturnModal(true);
    };

    const handleAddProductToReturn = (item: SellerInventoryItem) => {
      const existingItem = returnItems.find(ri => ri.productId === item.productId);
      if (existingItem) {
        toast.error('Este producto ya está en la lista de devolución');
        return;
      }
      setReturnItems([...returnItems, {
        productId: item.productId,
        product: item.product,
        quantity: 1,
        unitPrice: item.unitPrice,
        reason: ''
      }]);
    };

    const handleRemoveReturnItem = (productId: string) => {
      setReturnItems(returnItems.filter(item => item.productId !== productId));
    };

    const handleUpdateReturnItem = (productId: string, field: string, value: any) => {
      setReturnItems(returnItems.map(item =>
        item.productId === productId
          ? { ...item, [field]: value }
          : item
      ));
    };

    const handleSubmitReturn = async () => {
      if (returnItems.length === 0) {
        toast.error('Debe agregar al menos un producto para devolver');
        return;
      }

      if (!seller) {
        toast.error('Error: Información del vendedor no disponible');
        return;
      }

      // Validar que las cantidades no excedan el inventario disponible
      for (const returnItem of returnItems) {
        const inventoryItem = sellerInventory.find(item => item.productId === returnItem.productId);
        if (!inventoryItem || inventoryItem.quantity < returnItem.quantity) {
          toast.error(`La cantidad de ${returnItem.product.name} excede el inventario disponible`);
          return;
        }
      }

      try {
        const totalValue = returnItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        const returnItemsData: ReturnItem[] = returnItems.map(item => ({
          id: `${Date.now()}-${Math.random()}`,
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          reason: item.reason
        }));

        const returnData = {
          number: `DEV-${Date.now()}`,
          sellerId: seller.id,
          sellerName: seller.name,
          items: returnItemsData,
          totalValue,
          status: 'pending' as const,
          notes: returnNotes,
          createdAt: new Date()
        };

        await returnService.create(returnData);
        toast.success('Solicitud de devolución creada exitosamente');
        setReturnItems([]);
        setReturnNotes('');
        setShowReturnModal(false);
        await loadReturns();
      } catch (error) {
        console.error('Error creating return:', error);
        toast.error('Error al crear la solicitud de devolución');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Mis Devoluciones</h2>
          <button
            onClick={handleAddReturnItem}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Devolución
          </button>
        </div>

        {returns.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay devoluciones</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primera solicitud de devolución de productos.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {returnItem.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(returnItem.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {returnItem.items.length} producto(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${returnItem.totalValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnItem.status)}`}>
                        {getStatusText(returnItem.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setViewingReturn(returnItem)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal para crear devolución */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nueva Devolución</h3>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnItems([]);
                    setReturnNotes('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Productos Disponibles</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {sellerInventory.filter(item => item.quantity > 0).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleAddProductToReturn(item)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="font-medium text-sm text-gray-900">{item.product.name}</div>
                        <div className="text-xs text-gray-500">Stock: {item.quantity}</div>
                        <div className="text-xs text-gray-500">Precio: ${item.unitPrice.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {returnItems.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Productos a Devolver</h4>
                    <div className="space-y-2">
                      {returnItems.map((item) => {
                        const inventoryItem = sellerInventory.find(inv => inv.productId === item.productId);
                        const maxQuantity = inventoryItem?.quantity || 0;
                        return (
                          <div key={item.productId} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">{item.product.name}</div>
                              <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                min="1"
                                max={maxQuantity}
                                value={item.quantity}
                                onChange={(e) => handleUpdateReturnItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <div className="text-xs text-gray-500 mt-1">Max: {maxQuantity}</div>
                            </div>
                            <div className="w-32">
                              <input
                                type="text"
                                placeholder="Razón (opcional)"
                                value={item.reason || ''}
                                onChange={(e) => handleUpdateReturnItem(item.productId, 'reason', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div className="w-24 text-right">
                              <div className="text-sm font-medium text-gray-900">
                                ${(item.quantity * item.unitPrice).toLocaleString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveReturnItem(item.productId)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-900">Total:</span>
                        <span className="text-xl font-bold text-gray-900">
                          ${returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Información adicional sobre la devolución"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowReturnModal(false);
                      setReturnItems([]);
                      setReturnNotes('');
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitReturn}
                    className="btn-primary"
                    disabled={returnItems.length === 0}
                  >
                    Crear Devolución
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal para ver detalles de devolución */}
        {viewingReturn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles de la Devolución
                </h3>
                <button
                  onClick={() => setViewingReturn(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Devolución
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {viewingReturn.number}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(viewingReturn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingReturn.status)}`}>
                      {getStatusText(viewingReturn.status)}
                    </span>
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Productos</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cantidad
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio Unit.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Razón
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewingReturn.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.product.name}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-gray-900">
                                {item.product.sku}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-gray-900">
                                ${item.unitPrice.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                ${item.totalPrice.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-gray-900">
                                {item.reason || '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total de la Devolución:</span>
                    <span className="text-xl font-bold text-gray-900">
                      ${viewingReturn.totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Notas */}
                {viewingReturn.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {viewingReturn.notes}
                    </p>
                  </div>
                )}

                {/* Razón de rechazo si está rechazada */}
                {viewingReturn.status === 'rejected' && viewingReturn.rejectionReason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razón de Rechazo
                    </label>
                    <p className="text-sm text-red-900 bg-red-50 p-2 rounded">
                      {viewingReturn.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {viewingReturn.approvedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Aprobación
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {new Date(viewingReturn.approvedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {viewingReturn.rejectedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Rechazo
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {new Date(viewingReturn.rejectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => setViewingReturn(null)}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStoreEditor = () => {
    // Crear un mapa de productos ya en la tienda
    const storeProductMap = new Map(storeProducts.map(p => [p.productId, p]));

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Editor de Tienda Online</h2>
            <p className="text-gray-600">Gestiona los productos que aparecerán en tu tienda online</p>
            {seller && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-1">Link de tu tienda:</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/store/${seller.slug || 'generando...'}`}
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-md text-sm text-gray-900"
                  />
                  <button
                    onClick={async () => {
                      // Asegurar que el vendedor tenga slug
                      let slug = seller.slug;
                      if (!slug) {
                        try {
                          // Generar slug si no existe
                          const count = await sellerService.generateMissingSlugs();
                          // Recargar el seller actualizado
                          const updatedSeller = await sellerService.getById(seller.id);
                          if (updatedSeller?.slug) {
                            slug = updatedSeller.slug;
                            setSeller(updatedSeller);
                          }
                        } catch (error) {
                          console.error('Error generating slug:', error);
                        }
                      }

                      const link = `${window.location.origin}/store/${slug || seller.id}`;
                      navigator.clipboard.writeText(link);
                      toast.success('Link copiado al portapapeles');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Copiar Link
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Comparte este link con tus clientes para que vean tu tienda online
                </p>
                {!seller.slug && (
                  <button
                    onClick={async () => {
                      try {
                        await sellerService.generateMissingSlugs();
                        const updatedSeller = await sellerService.getById(seller.id);
                        if (updatedSeller) {
                          setSeller(updatedSeller);
                          toast.success('Slug generado correctamente');
                        }
                      } catch (error) {
                        console.error('Error generating slug:', error);
                        toast.error('Error al generar slug');
                      }
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Generar slug para URL amigable
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              if (seller?.id) {
                // Asegurar que el vendedor tenga slug
                let sellerSlug = seller.slug;
                if (!sellerSlug) {
                  // Generar slug si no existe
                  try {
                    const updatedSeller = await sellerService.getById(seller.id);
                    if (updatedSeller?.slug) {
                      sellerSlug = updatedSeller.slug;
                    } else {
                      // Si aún no tiene slug, usar el ID temporalmente
                      sellerSlug = seller.id;
                    }
                  } catch (error) {
                    sellerSlug = seller.id;
                  }
                }
                navigate(`/store/${sellerSlug}`);
              }
            }}
            className="btn-primary flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Tienda
          </button>
        </div>

        {/* Productos del Inventario */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Productos de tu Inventario</h3>
            <p className="text-sm text-gray-500">Agrega productos a tu tienda estableciendo precio y descripción</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio en Tienda</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sellerInventory
                  .filter(item => item.quantity > 0 && item.status === 'stock')
                  .map((item) => {
                    const storeProduct = storeProductMap.get(item.productId);
                    const isInStore = !!storeProduct;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-16 w-16 rounded-lg overflow-hidden">
                            {item.product?.imageUrl ? (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                                <Package className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.product?.name || 'N/A'}</div>
                          {item.product?.category && (
                            <div className="text-sm text-gray-500">{item.product.category}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.product?.sku || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isInStore ? (
                            <span className="text-sm font-medium text-green-600">
                              ${storeProduct.salePrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">No en tienda</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isInStore ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${storeProduct.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                              {storeProduct.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {isInStore ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingStoreProduct({
                                    productId: item.productId,
                                    salePrice: storeProduct.salePrice,
                                    description: storeProduct.description || ''
                                  });
                                }}
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                              </button>
                              <button
                                onClick={() => handleToggleStoreProduct(storeProduct.id, storeProduct.isActive)}
                                className={`px-2 py-1 rounded text-xs ${storeProduct.isActive
                                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                title={storeProduct.isActive ? 'Desactivar' : 'Activar'}
                              >
                                {storeProduct.isActive ? 'Ocultar' : 'Mostrar'}
                              </button>
                              <button
                                onClick={() => handleRemoveFromStore(storeProduct.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStoreProduct({
                                  productId: item.productId,
                                  salePrice: item.unitPrice || 0,
                                  description: ''
                                });
                              }}
                              className="btn-primary flex items-center text-sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar a Tienda
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {sellerInventory.filter(item => item.quantity > 0 && item.status === 'stock').length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos disponibles</h3>
              <p className="mt-1 text-sm text-gray-500">No tienes productos en stock para agregar a la tienda.</p>
            </div>
          )}
        </div>

        {/* Modal para agregar/editar producto en tienda */}
        {editingStoreProduct && (() => {
          const inventoryItem = sellerInventory.find(item => item.productId === editingStoreProduct.productId);
          if (!inventoryItem) return null;

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {storeProductMap.has(editingStoreProduct.productId) ? 'Editar Producto en Tienda' : 'Agregar Producto a Tienda'}
                  </h3>
                  <button
                    onClick={() => setEditingStoreProduct(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Información del producto */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      {inventoryItem.product?.imageUrl && (
                        <img
                          src={inventoryItem.product.imageUrl}
                          alt={inventoryItem.product.name}
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{inventoryItem.product?.name}</h4>
                        <p className="text-sm text-gray-500">SKU: {inventoryItem.product?.sku}</p>
                        <p className="text-sm text-gray-500">Stock disponible: {inventoryItem.quantity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Precio de venta */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio de Venta *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingStoreProduct.salePrice}
                      onChange={(e) => setEditingStoreProduct({
                        ...editingStoreProduct,
                        salePrice: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Precio al que vendrás este producto a tus clientes
                    </p>
                  </div>

                  {/* Descripción opcional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción (Opcional)
                    </label>
                    <textarea
                      value={editingStoreProduct.description}
                      onChange={(e) => setEditingStoreProduct({
                        ...editingStoreProduct,
                        description: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={4}
                      placeholder="Descripción del producto para tus clientes..."
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setEditingStoreProduct(null)}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleAddToStore(
                        inventoryItem,
                        editingStoreProduct.salePrice,
                        editingStoreProduct.description
                      )}
                      className="btn-primary flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {storeProductMap.has(editingStoreProduct.productId) ? 'Actualizar' : 'Agregar a Tienda'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modal de Vista Previa de la Tienda */}
        {showStorePreview && seller && (
          <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            <div className="bg-white border-b sticky top-0 z-10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tienda de {seller.name}</h1>
                    <p className="text-sm text-gray-600">Vista previa - Así verán tus clientes la tienda</p>
                  </div>
                  <button
                    onClick={() => setShowStorePreview(false)}
                    className="btn-secondary flex items-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cerrar Vista
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {storeProducts.filter(p => p.isActive).length === 0 ? (
                <div className="text-center py-12">
                  <Store className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Tienda vacía</h3>
                  <p className="mt-1 text-sm text-gray-500">Agrega productos a tu tienda para que aparezcan aquí.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {storeProducts
                    .filter(p => p.isActive)
                    .map((storeProduct) => (
                      <div
                        key={storeProduct.id}
                        className="bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
                        onClick={() => setSelectedStoreProduct(storeProduct)}
                      >
                        <div className="w-full h-44 bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
                          {storeProduct.product?.imageUrl ? (
                            <img
                              src={storeProduct.product.imageUrl}
                              alt={storeProduct.product.name}
                              className="w-full h-full object-contain max-w-full max-h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 flex flex-col flex-grow">
                          <h3 className="font-medium text-xs text-gray-900 mb-0.5 line-clamp-2 leading-tight min-h-[2rem]">
                            {storeProduct.product?.name || 'Producto'}
                          </h3>
                          <div className="flex items-center gap-2 mb-1">
                            {storeProduct.product?.sku && (
                              <p className="text-xs text-gray-500 leading-tight">SKU: {storeProduct.product.sku}</p>
                            )}
                            {storeProduct.product?.size && (
                              <p className="text-xs text-gray-700 font-semibold leading-tight">Talla: {storeProduct.product.size}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-sm font-bold text-primary-600">
                              ${storeProduct.salePrice.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal de Detalle del Producto en Vista Previa */}
            {selectedStoreProduct && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => setSelectedStoreProduct(null)}>
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  {/* Header del Modal */}
                  <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Detalle del Producto</h2>
                    <button
                      onClick={() => setSelectedStoreProduct(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Contenido del Modal */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Imagen */}
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        {selectedStoreProduct.product?.imageUrl ? (
                          <img
                            src={selectedStoreProduct.product.imageUrl}
                            alt={selectedStoreProduct.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-24 w-24 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Detalles */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {selectedStoreProduct.product?.name || 'Producto'}
                          </h3>
                          {selectedStoreProduct.product?.sku && (
                            <p className="text-sm text-gray-500">SKU: {selectedStoreProduct.product.sku}</p>
                          )}
                        </div>

                        {/* Talla y Color */}
                        <div className="grid grid-cols-2 gap-4">
                          {selectedStoreProduct.product?.size && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-1">Talla</h4>
                              <p className="text-base text-gray-900 font-medium">
                                {selectedStoreProduct.product.size}
                              </p>
                            </div>
                          )}
                          {(selectedStoreProduct.product?.color || selectedStoreProduct.product?.color2) && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-1">Color</h4>
                              <p className="text-base text-gray-900 font-medium">
                                {selectedStoreProduct.product.color}
                                {selectedStoreProduct.product.color2 && selectedStoreProduct.product.color && ' / '}
                                {selectedStoreProduct.product.color2}
                              </p>
                            </div>
                          )}
                        </div>

                        {selectedStoreProduct.description && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h4>
                            <p className="text-gray-600 leading-relaxed">
                              {selectedStoreProduct.description}
                            </p>
                          </div>
                        )}

                        {selectedStoreProduct.product?.description && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Información del Producto</h4>
                            <p className="text-gray-600 leading-relaxed">
                              {selectedStoreProduct.product.description}
                            </p>
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-3xl font-bold text-primary-600">
                              ${selectedStoreProduct.salePrice.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {seller && (
                          <div className="pt-4 border-t">
                            <p className="text-sm text-gray-500">
                              Vendedor: <span className="font-medium text-gray-700">{seller.name}</span>
                            </p>
                            {seller.phone && (
                              <p className="text-sm text-gray-500 mt-1">
                                Teléfono: <span className="font-medium text-gray-700">{seller.phone}</span>
                              </p>
                            )}
                            {seller.email && (
                              <p className="text-sm text-gray-500 mt-1">
                                Email: <span className="font-medium text-gray-700">{seller.email}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 px-[200px]">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel del Vendedor</h1>
              <p className="text-sm text-gray-600">Bienvenido, {seller.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Tipo de precio: {seller.priceType === 'price2' ? 'Precio 2' : 'Precio 1'}
              </span>

              {/* Información del usuario */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.displayName || seller.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || seller.email}
                  </p>
                </div>
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || seller.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary-600">
                      {(user?.displayName || seller.name).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'dashboard'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <BarChart3 className="h-5 w-5 inline mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveSection('inventory')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'inventory'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Package className="h-5 w-5 inline mr-2" />
            Inventario
          </button>
          <button
            onClick={() => setActiveSection('sales')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'sales'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <ShoppingCart className="h-5 w-5 inline mr-2" />
            Ventas
          </button>
          <button
            onClick={() => setActiveSection('exit-notes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'exit-notes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <FileText className="h-5 w-5 inline mr-2" />
            Notas de Salida
          </button>
          <button
            onClick={() => setActiveSection('shipping-packages')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'shipping-packages'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Truck className="h-5 w-5 inline mr-2" />
            Paquetes de Envío
          </button>
          <button
            onClick={() => setActiveSection('payment-notes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'payment-notes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Receipt className="h-5 w-5 inline mr-2" />
            Notas de Pago
          </button>
          <button
            onClick={() => setActiveSection('generate-order')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'generate-order'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Plus className="h-5 w-5 inline mr-2" />
            Generar Pedido
          </button>
          <button
            onClick={() => setActiveSection('my-orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'my-orders'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Package className="h-5 w-5 inline mr-2" />
            Mis Pedidos
          </button>
          <button
            onClick={() => setActiveSection('store')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'store'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Store className="h-5 w-5 inline mr-2" />
            Tienda Online
          </button>
          <button
            onClick={() => setActiveSection('returns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeSection === 'returns'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <RotateCcw className="h-5 w-5 inline mr-2" />
            Devoluciones
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="px-2 sm:px-6 py-4 sm:py-8">
        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'inventory' && renderInventory()}
        {activeSection === 'sales' && renderSales()}
        {activeSection === 'exit-notes' && renderExitNotes()}
        {activeSection === 'shipping-packages' && renderShippingPackages()}
        {activeSection === 'payment-notes' && renderPaymentNotes()}
        {activeSection === 'generate-order' && renderGenerateOrder()}
        {activeSection === 'my-orders' && renderMyOrders()}
        {activeSection === 'store' && renderStoreEditor()}
        {activeSection === 'returns' && renderReturns()}
      </div>

      {/* Modal de Nueva Venta */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Venta</h3>
              <button
                onClick={() => setShowSaleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto
                </label>
                <select
                  required
                  value={saleForm.productId}
                  onChange={(e) => setSaleForm({ ...saleForm, productId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar producto</option>
                  {sellerInventory
                    .filter(item => item.status === 'stock' && item.quantity > 0)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.product.name} - Stock: {item.quantity}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  max={(() => {
                    const selectedProduct = sellerInventory.find(item => item.id === saleForm.productId);
                    return selectedProduct ? selectedProduct.quantity : 1;
                  })()}
                  required
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({ ...saleForm, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {saleForm.productId && (() => {
                  const selectedProduct = sellerInventory.find(item => item.id === saleForm.productId);
                  return selectedProduct ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Stock disponible: {selectedProduct.quantity}
                    </p>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pago
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="credit"
                      checked={saleForm.paymentType === 'credit'}
                      onChange={(e) => setSaleForm({ ...saleForm, paymentType: e.target.value as 'credit' | 'cash' })}
                      className="mr-2"
                    />
                    <CreditCard className="h-4 w-4 mr-1 text-blue-500" />
                    Crédito
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="cash"
                      checked={saleForm.paymentType === 'cash'}
                      onChange={(e) => setSaleForm({ ...saleForm, paymentType: e.target.value as 'credit' | 'cash' })}
                      className="mr-2"
                    />
                    <Banknote className="h-4 w-4 mr-1 text-green-500" />
                    Efectivo
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Registrar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal de Nueva Nota de Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Nota de Pago</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda - Información de Deuda */}
              <div className="space-y-4">
                {/* Información de Deuda */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Deuda Actual</h4>
                  <div className="text-2xl font-bold text-blue-900">
                    ${(() => {
                      const historicalValue = exitNotes.reduce((sum, note) => {
                        return sum + note.totalPrice;
                      }, 0);
                      const approvedPayments = paymentNotes
                        .filter(note => note.status === 'approved')
                        .reduce((sum, note) => {
                          return sum + note.totalAmount;
                        }, 0);
                      const currentDebt = historicalValue - approvedPayments;
                      return currentDebt.toFixed(2);
                    })()}
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Valor total de tu inventario pendiente de pago
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Productos en inventario: {sellerInventory.length} | Tipo de precio: {seller?.priceType === 'price2' ? 'Precio 2' : 'Precio 1'}
                  </p>
                </div>

                {/* Tipo de Pago */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Tipo de Pago</h4>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 bg-gray-50 rounded border hover:bg-gray-100 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        value="full"
                        checked={paymentType === 'full'}
                        onChange={(e) => setPaymentType(e.target.value as 'full' | 'partial')}
                        className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Pago Total</div>
                        <div className="text-xs text-gray-500">Pagar toda la deuda actual</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 bg-gray-50 rounded border hover:bg-gray-100 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        value="partial"
                        checked={paymentType === 'partial'}
                        onChange={(e) => setPaymentType(e.target.value as 'full' | 'partial')}
                        className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Pago Parcial</div>
                        <div className="text-xs text-gray-500">Pagar un monto específico</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Columna Derecha - Método de Pago y Detalles */}
              <div className="space-y-4">
                {/* Método de Pago */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Método de Pago</h4>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 bg-gray-50 rounded border hover:bg-gray-100 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_deposit')}
                        className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Efectivo</div>
                        <div className="text-xs text-gray-500">Pago en efectivo</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 bg-gray-50 rounded border hover:bg-gray-100 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_deposit"
                        checked={paymentMethod === 'bank_deposit'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_deposit')}
                        className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Depósito Bancario</div>
                        <div className="text-xs text-gray-500">Transferencia o depósito bancario</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Subir Comprobante para Depósito Bancario */}
                {paymentMethod === 'bank_deposit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comprobante de Pago
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sube una foto del comprobante de depósito o transferencia
                    </p>
                    {receiptFile && (
                      <p className="text-xs text-green-600 mt-1">
                        Archivo seleccionado: {receiptFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Monto del Pago Parcial */}
                {paymentType === 'partial' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto del Pago
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(() => {
                        const historicalValue = exitNotes.reduce((sum, note) => {
                          return sum + note.totalPrice;
                        }, 0);
                        return historicalValue;
                      })()}
                      value={partialPaymentAmount}
                      onChange={(e) => setPartialPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Monto máximo: ${(() => {
                        const historicalValue = exitNotes.reduce((sum, note) => {
                          return sum + note.totalPrice;
                        }, 0);
                        const approvedPayments = paymentNotes
                          .filter(note => note.status === 'approved')
                          .reduce((sum, note) => {
                            return sum + note.totalAmount;
                          }, 0);
                        const currentDebt = historicalValue - approvedPayments;
                        return currentDebt.toFixed(2);
                      })()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen del Pago */}
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Resumen del Pago</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Deuda Actual</div>
                  <div className="font-semibold text-red-600">${(() => {
                    const historicalValue = exitNotes.reduce((sum, note) => {
                      return sum + note.totalPrice;
                    }, 0);
                    const approvedPayments = paymentNotes
                      .filter(note => note.status === 'approved')
                      .reduce((sum, note) => {
                        return sum + note.totalAmount;
                      }, 0);
                    const currentDebt = historicalValue - approvedPayments;
                    return currentDebt.toFixed(2);
                  })()}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Monto del Pago</div>
                  <div className="font-semibold text-blue-600">${paymentType === 'full' ? (() => {
                    const historicalValue = exitNotes.reduce((sum, note) => {
                      return sum + note.totalPrice;
                    }, 0);
                    const approvedPayments = paymentNotes
                      .filter(note => note.status === 'approved')
                      .reduce((sum, note) => {
                        return sum + note.totalAmount;
                      }, 0);
                    const currentDebt = historicalValue - approvedPayments;
                    return currentDebt.toFixed(2);
                  })() : partialPaymentAmount.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Deuda Restante</div>
                  <div className="font-semibold text-green-600">${(() => {
                    const historicalValue = exitNotes.reduce((sum, note) => {
                      return sum + note.totalPrice;
                    }, 0);
                    const approvedPayments = paymentNotes
                      .filter(note => note.status === 'approved')
                      .reduce((sum, note) => {
                        return sum + note.totalAmount;
                      }, 0);
                    const currentDebt = historicalValue - approvedPayments;
                    const paymentAmount = paymentType === 'full' ? currentDebt : partialPaymentAmount;
                    return (currentDebt - paymentAmount).toFixed(2);
                  })()}</div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!seller) return;

                    const historicalValue = exitNotes.reduce((sum, note) => {
                      return sum + note.totalPrice;
                    }, 0);

                    const paymentAmount = paymentType === 'full' ? historicalValue : partialPaymentAmount;

                    if (paymentType === 'partial' && partialPaymentAmount <= 0) {
                      toast.error('El monto del pago debe ser mayor a 0');
                      return;
                    }

                    if (paymentType === 'partial' && partialPaymentAmount > historicalValue) {
                      toast.error('El monto del pago no puede ser mayor a la deuda actual');
                      return;
                    }

                    // Validar que si es depósito bancario, se haya subido un comprobante
                    if (paymentMethod === 'bank_deposit' && !receiptFile) {
                      toast.error('Por favor sube un comprobante para el depósito bancario');
                      return;
                    }

                    let receiptImageUrl = '';

                    // Si es depósito bancario y hay archivo, subirlo a Firebase Storage
                    if (paymentMethod === 'bank_deposit' && receiptFile) {
                      setUploadingReceipt(true);
                      try {
                        const fileName = `receipts/${seller.id}_${Date.now()}_${receiptFile.name}`;
                        const storageRef = ref(storage, fileName);
                        await uploadBytes(storageRef, receiptFile);
                        receiptImageUrl = await getDownloadURL(storageRef);
                        toast.success('Comprobante subido exitosamente');
                      } catch (error) {
                        console.error('Error uploading receipt:', error);
                        toast.error('Error al subir el comprobante');
                        setUploadingReceipt(false);
                        return;
                      }
                      setUploadingReceipt(false);
                    }

                    // Crear la nota de pago
                    const paymentNoteData: any = {
                      number: `PN-${Date.now()}`, // Generar número único
                      sourceType: 'seller' as const,
                      sellerId: seller.id,
                      sellerName: seller.name,
                      items: [{
                        description: paymentType === 'full' ? 'Pago total de deuda' : `Pago parcial de deuda - $${partialPaymentAmount}`,
                        amount: paymentAmount
                      }],
                      totalAmount: paymentAmount,
                      status: 'pending' as const,
                      notes: `Pago ${paymentType === 'full' ? 'total' : 'parcial'} de deuda del inventario - ${paymentMethod === 'cash' ? 'En efectivo' : 'Depósito bancario'}`,
                      paymentMethod: paymentMethod
                    };

                    // Solo incluir receiptImageUrl si tiene un valor válido
                    if (receiptImageUrl && receiptImageUrl.trim() !== '') {
                      paymentNoteData.receiptImageUrl = receiptImageUrl;
                    }

                    await paymentNoteService.create(paymentNoteData);
                    toast.success('Nota de pago creada exitosamente');
                    setShowPaymentModal(false);
                    setPaymentType('full');
                    setPartialPaymentAmount(0);
                    setPaymentMethod('cash');
                    setReceiptFile(null);
                    await loadData();
                  } catch (error) {
                    console.error('Error creating payment note:', error);
                    toast.error('Error al crear la nota de pago');
                  }
                }}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${uploadingReceipt
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                disabled={uploadingReceipt}
              >
                {uploadingReceipt ? 'Subiendo comprobante...' : 'Crear Nota de Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Nota de Salida */}
      {viewingExitNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-[95vw] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles de Nota de Salida</h3>
              <button
                onClick={() => setViewingExitNote(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Información General</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Número:</span> {viewingExitNote.number}</p>
                  <p><span className="font-medium">Fecha:</span> {new Date(viewingExitNote.date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Cliente:</span> {viewingExitNote.customer}</p>
                  <p><span className="font-medium">Estado:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${viewingExitNote.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : viewingExitNote.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                      {viewingExitNote.status === 'delivered' ? 'Entregada' :
                        viewingExitNote.status === 'pending' ? 'Pendiente' :
                          viewingExitNote.status === 'received' ? 'Recibida' : 'Cancelada'}
                    </span>
                  </p>
                  {viewingExitNote.notes && (
                    <p><span className="font-medium">Notas:</span> {viewingExitNote.notes}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Totales</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Total:</span> ${(viewingExitNote.totalPrice || 0).toLocaleString()}</p>
                  <p><span className="font-medium">Productos:</span> {viewingExitNote.items.length}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Productos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talla</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewingExitNote.items.map((item, index) => {
                      console.log('Producto en nota de salida:', item);
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                              {item.product && item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-75"
                                  onClick={() => setViewingProductImage(item.product.imageUrl || null)}
                                  onError={(e) => {
                                    console.log('Error loading image:', item.product.imageUrl);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              {(!item.product || !item.product.imageUrl) && (
                                <span className="text-xs text-gray-500">Sin imagen</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.size || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${item.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver imagen del producto */}
      {viewingProductImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Imagen del Producto</h3>
              <button
                onClick={() => setViewingProductImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={viewingProductImage}
                alt="Imagen del producto"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Nota de Pago */}
      {viewingPaymentNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles de Nota de Pago</h3>
              <button
                onClick={() => setViewingPaymentNote(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Información básica */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Información General</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Número:</span>
                    <p className="text-gray-900">{viewingPaymentNote.number}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Fecha:</span>
                    <p className="text-gray-900">{new Date(viewingPaymentNote.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Total:</span>
                    <p className="text-gray-900 font-semibold">${viewingPaymentNote.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Estado:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${viewingPaymentNote.status === 'approved' ? 'bg-green-100 text-green-800' :
                        viewingPaymentNote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {viewingPaymentNote.status === 'approved' ? 'Aprobada' :
                        viewingPaymentNote.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalles del pago */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Detalles del Pago</h4>
                <div className="space-y-2 text-sm">
                  {viewingPaymentNote.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900">{item.description || 'Pago de deuda'}</p>
                        <p className="text-gray-600 text-xs">
                          {item.totalPrice > 0 ? `Pago por ${item.quantity} unidades` : 'Abono de deuda'}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">${(item.totalPrice || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información adicional */}
              {viewingPaymentNote.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                  <p className="text-sm text-gray-700">{viewingPaymentNote.notes}</p>
                </div>
              )}

              {/* Fecha de aprobación si está aprobada */}
              {viewingPaymentNote.status === 'approved' && viewingPaymentNote.approvedAt && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Aprobación</h4>
                  <p className="text-sm text-green-700">
                    Aprobada el {new Date(viewingPaymentNote.approvedAt).toLocaleDateString()}
                    {viewingPaymentNote.approvedBy && ` por ${viewingPaymentNote.approvedBy}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Paquete de Envío */}
      {viewingShippingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-[95vw] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles del Paquete de Envío</h3>
              <button
                onClick={() => setViewingShippingPackage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Información del Envío</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Tracking:</span> {viewingShippingPackage.trackingNumber || 'No asignado'}</p>
                  <p><span className="font-medium">Destinatario:</span> {viewingShippingPackage.recipient}</p>
                  <p><span className="font-medium">Dirección:</span> {viewingShippingPackage.address}</p>
                  <p><span className="font-medium">Ciudad:</span> {viewingShippingPackage.city}</p>
                  <p><span className="font-medium">Teléfono:</span> {viewingShippingPackage.phone}</p>
                  <p><span className="font-medium">Estado:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${viewingShippingPackage.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        viewingShippingPackage.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                          viewingShippingPackage.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                      }`}>
                      {viewingShippingPackage.status === 'pending' ? 'Pendiente' :
                        viewingShippingPackage.status === 'in-transit' ? 'En Tránsito' :
                          viewingShippingPackage.status === 'delivered' ? 'En Camino' :
                            'Devuelto'}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Detalles del Paquete</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Fecha de Envío:</span> {new Date(viewingShippingPackage.shippingDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Peso:</span> {viewingShippingPackage.weight.toFixed(2)}g</p>
                  <p><span className="font-medium">Dimensiones:</span> {viewingShippingPackage.dimensions}</p>
                  <p><span className="font-medium">Costo:</span> ${viewingShippingPackage.cost.toLocaleString()}</p>
                  {viewingShippingPackage.deliveryDate && (
                    <p><span className="font-medium">Fecha de Entrega:</span> {new Date(viewingShippingPackage.deliveryDate).toLocaleDateString()}</p>
                  )}
                  {viewingShippingPackage.notes && (
                    <p><span className="font-medium">Notas:</span> {viewingShippingPackage.notes}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de Productos */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Productos en el Paquete</h4>
              {viewingShippingPackage.items && viewingShippingPackage.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talla</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {viewingShippingPackage.items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                              {item.product && item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-75"
                                  onClick={() => setViewingProductImage(item.product.imageUrl || null)}
                                  onError={(e) => {
                                    console.log('Error loading image:', item.product.imageUrl);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              {(!item.product || !item.product.imageUrl) && (
                                <span className="text-xs text-gray-500">Sin imagen</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.product ? item.product.name : 'Producto no encontrado'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.product ? item.product.sku : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.size || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(item.unitPrice || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No hay productos asociados a este paquete</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Generar Pedido - Inventario del Admin */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Inventario Disponible - Generar Pedido</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adminInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product?.name || 'Producto no encontrado'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.product?.sku || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.quantity || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.location || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${item.product?.salePrice1?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'stock' ? 'bg-green-100 text-green-800' :
                              item.status === 'in-transit' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {item.status === 'stock' ? 'En Stock' :
                              item.status === 'in-transit' ? 'En Tránsito' : 'En Camino'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {adminInventory.length === 0 && (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay inventario disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Producto */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Detalles del Producto</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedProduct.product?.imageUrl && (
                <div className="flex justify-center">
                  <img
                    src={selectedProduct.product.imageUrl}
                    alt={selectedProduct.product.name}
                    className="h-48 w-48 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Producto</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.product?.name || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.product?.sku || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.quantity || 0}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.location || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio Unit.</label>
                  <p className="mt-1 text-sm text-gray-900">${selectedProduct.product?.salePrice1?.toFixed(2) || '0.00'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedProduct.status === 'stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {selectedProduct.status === 'stock' ? 'En Stock' : 'Sin Stock'}
                  </span>
                </div>
              </div>

              {selectedProduct.product?.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.product.description}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <label className="block text-sm font-medium text-gray-700">Cantidad:</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct.quantity}
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Math.max(1, Math.min(selectedProduct.quantity, parseInt(e.target.value) || 1)))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-500">
                      (Máximo: {selectedProduct.quantity})
                    </span>
                  </div>

                  <button
                    onClick={handleAddToOrder}
                    disabled={orderQuantity > selectedProduct.quantity}
                    className={`px-4 py-2 rounded-md font-medium ${orderQuantity > selectedProduct.quantity
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                  >
                    {orderQuantity > selectedProduct.quantity ? 'No Disponible' : 'Agregar al Pedido'}
                  </button>
                </div>

                {orderQuantity > selectedProduct.quantity && (
                  <p className="mt-2 text-sm text-red-600">
                    Solo hay {selectedProduct.quantity} unidades disponibles en stock
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición del Pedido */}
      {showOrderFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Tu Pedido - Editar Cantidades</h3>
              <button
                onClick={() => setShowOrderFile(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {editingOrderItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay productos en el pedido</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {editingOrderItems.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {item.product?.imageUrl && (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{item.product?.name}</h4>
                            <p className="text-sm text-gray-500">SKU: {item.product?.sku}</p>
                            <p className="text-sm text-gray-500">Precio: ${(item.product?.salePrice1 || 0).toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateOrderItemQuantity(item.id, item.orderQuantity - 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={item.orderQuantity}
                              onChange={(e) => updateOrderItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                            />
                            <button
                              onClick={() => updateOrderItemQuantity(item.id, item.orderQuantity + 1)}
                              disabled={item.orderQuantity >= item.quantity}
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              ${((item.product?.salePrice1 || 0) * item.orderQuantity).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Stock: {item.quantity}
                            </p>
                          </div>

                          <button
                            onClick={() => removeOrderItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Resumen del Pedido */}
                  <div className="bg-primary-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-primary-700">
                          Total de productos: {editingOrderItems.length}
                        </p>
                        <p className="text-sm text-primary-700">
                          Cantidad total: {editingOrderItems.reduce((total, item) => total + item.orderQuantity, 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-600">
                          ${editingOrderItems.reduce((total, item) =>
                            total + ((item.product?.salePrice1 || 0) * item.orderQuantity), 0
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowOrderFile(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveOrderChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Guardar Cambios
              </button>
              {editingOrderItems.length > 0 && (
                <button
                  onClick={generateOrder}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Generar Pedido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Pedido */}
      {showOrderDetailsModal && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Detalles del Pedido #{selectedOrderDetails.id?.slice(-8)}</h3>
              <button
                onClick={() => setShowOrderDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Información del Pedido */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información del Pedido</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">ID:</span> {selectedOrderDetails.id}
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedOrderDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedOrderDetails.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedOrderDetails.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                      }`}>
                      {selectedOrderDetails.status === 'pending' ? 'Pendiente' :
                        selectedOrderDetails.status === 'approved' ? 'Aprobado' :
                          selectedOrderDetails.status === 'rejected' ? 'Rechazado' : 'Completado'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {selectedOrderDetails.createdAt.toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> ${selectedOrderDetails.totalAmount.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Productos:</span> {selectedOrderDetails.totalItems}
                  </div>
                  <div>
                    <span className="font-medium">Cantidad Total:</span> {selectedOrderDetails.totalQuantity}
                  </div>
                </div>
              </div>

              {/* Productos del Pedido */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Productos Solicitados</h4>
                <div className="space-y-2">
                  {selectedOrderDetails.items.map((item, index) => (
                    <div key={index} className="bg-white border rounded p-2">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-gray-900 text-sm">{item.productName}</h5>
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-primary-600">${item.subtotal.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                            <span>Cantidad: {item.quantity}</span>
                            <span>Precio: ${item.unitPrice.toFixed(2)}</span>
                            <span>Ubicación: {item.location}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {item.status === 'stock' ? 'En Stock' : 'Sin Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas del Administrador */}
              {selectedOrderDetails.notes && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Notas del Administrador</h4>
                  <p className="text-blue-800">{selectedOrderDetails.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowOrderDetailsModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contra Orden */}
      {showCounterOrderModal && selectedCounterOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Contra Orden - Pedido #{selectedCounterOrder.id?.slice(-8)}</h3>
              <button
                onClick={() => setShowCounterOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Información del Pedido Original */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Pedido Original</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">ID:</span> {selectedCounterOrder.id}
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCounterOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedCounterOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedCounterOrder.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                      }`}>
                      {selectedCounterOrder.status === 'pending' ? 'Pendiente' :
                        selectedCounterOrder.status === 'approved' ? 'Aprobado' :
                          selectedCounterOrder.status === 'rejected' ? 'Rechazado' : 'Completado'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {selectedCounterOrder.createdAt.toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div>
                    <span className="font-medium">Total Solicitado:</span> ${selectedCounterOrder.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Productos - Mostrar aprobados si existen, sino pendientes */}
              <div>
                {selectedCounterOrder.approvedItems && selectedCounterOrder.approvedItems.length > 0 ? (
                  <>
                    <h4 className="font-medium text-gray-900 mb-3">Productos Confirmados para Envío</h4>
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-green-800">
                        <strong>Confirmado:</strong> El administrador ha revisado y confirmado los siguientes productos para el envío.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {selectedCounterOrder.approvedItems.map((item, index) => (
                        <div key={index} className="bg-white border rounded p-2">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">{item.productName}</h5>
                                  <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-600">${item.subtotal.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                                <span>Cantidad Confirmada: {item.quantity}</span>
                                <span>Precio: ${item.unitPrice.toFixed(2)}</span>
                                <span>Ubicación: {item.location}</span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Confirmado
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : selectedCounterOrder.status === 'rejected' ? (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">Pedido Rechazado</h4>
                    <p className="text-red-800">Este pedido ha sido rechazado por el administrador.</p>
                  </div>
                ) : (
                  <>
                    <h4 className="font-medium text-gray-900 mb-3">Productos Solicitados - Pendientes de Confirmación</h4>
                    <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Nota:</strong> Esta contra orden muestra los productos que solicitaste.
                        El administrador aún no ha confirmado cuáles están disponibles para envío.
                        Una vez que el administrador revise y confirme la disponibilidad,
                        se actualizará con los productos que realmente se enviarán.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {selectedCounterOrder.items.map((item, index) => (
                        <div key={index} className="bg-white border rounded p-2">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900 text-sm">{item.productName}</h5>
                                  <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-600">${item.subtotal.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                                <span>Cantidad Solicitada: {item.quantity}</span>
                                <span>Precio: ${item.unitPrice.toFixed(2)}</span>
                                <span>Ubicación: {item.location}</span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pendiente
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Resumen de la Contra Orden */}
              <div className={`p-4 rounded-lg ${selectedCounterOrder.approvedItems && selectedCounterOrder.approvedItems.length > 0
                  ? 'bg-green-50'
                  : selectedCounterOrder.status === 'rejected'
                    ? 'bg-red-50'
                    : 'bg-yellow-50'
                }`}>
                <h4 className={`font-medium mb-2 ${selectedCounterOrder.approvedItems && selectedCounterOrder.approvedItems.length > 0
                    ? 'text-green-900'
                    : selectedCounterOrder.status === 'rejected'
                      ? 'text-red-900'
                      : 'text-yellow-900'
                  }`}>
                  Resumen del Pedido
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Productos Solicitados:</span> {selectedCounterOrder.totalItems}
                  </div>
                  <div>
                    <span className="font-medium">Cantidad Total Solicitada:</span> {selectedCounterOrder.totalQuantity}
                  </div>
                  <div>
                    <span className="font-medium">Total Solicitado:</span> ${selectedCounterOrder.totalAmount.toFixed(2)}
                  </div>
                  {selectedCounterOrder.approvedItems && selectedCounterOrder.approvedItems.length > 0 && (
                    <>
                      <div>
                        <span className="font-medium">Productos Confirmados:</span> {selectedCounterOrder.approvedItems.length}
                      </div>
                      <div>
                        <span className="font-medium">Cantidad Total Confirmada:</span> {selectedCounterOrder.approvedItems.reduce((sum, item) => sum + item.quantity, 0)}
                      </div>
                      <div>
                        <span className="font-medium">Total Confirmado:</span> ${selectedCounterOrder.approvedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
                      </div>
                    </>
                  )}
                  <div>
                    <span className="font-medium">Estado:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCounterOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedCounterOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedCounterOrder.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                      }`}>
                      {selectedCounterOrder.status === 'pending' ? 'Pendiente de Confirmación' :
                        selectedCounterOrder.status === 'approved' ? 'Confirmado' :
                          selectedCounterOrder.status === 'rejected' ? 'Rechazado' : 'Completado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notas del Administrador */}
              {selectedCounterOrder.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Notas del Administrador</h4>
                  <p className="text-yellow-800">{selectedCounterOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowCounterOrderModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Pedido */}
      {showEditOrderModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Editar Pedido #{editingOrder.id?.slice(-8)}</h3>
              <button
                onClick={() => setShowEditOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Solo puedes editar pedidos que están pendientes de confirmación.
                  Una vez que el administrador confirme el pedido, ya no se podrá modificar.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Productos del Pedido</h4>
                <div className="space-y-3">
                  {editingOrder.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.productName}</h5>
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Cantidad:</span> {item.quantity}
                            </div>
                            <div>
                              <span className="font-medium">Precio Unit.:</span> ${item.unitPrice.toFixed(2)}
                            </div>
                            <div>
                              <span className="font-medium">Ubicación:</span> {item.location}
                            </div>
                            <div>
                              <span className="font-medium">Subtotal:</span> ${item.subtotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Información del Pedido</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total:</span> ${editingOrder.totalAmount.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Productos:</span> {editingOrder.totalItems}
                  </div>
                  <div>
                    <span className="font-medium">Cantidad Total:</span> {editingOrder.totalQuantity}
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span>
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pendiente
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowEditOrderModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Aquí se implementaría la lógica de edición
                  toast.success('Funcionalidad de edición en desarrollo');
                  setShowEditOrderModal(false);
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;

