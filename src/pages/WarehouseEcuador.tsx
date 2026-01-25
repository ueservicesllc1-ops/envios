import React, { useState, useEffect, useMemo } from 'react';
import { Package, MapPin, Search, Filter, Plus, Eye, Edit, Flag, X, Users, Truck, Trash2 } from 'lucide-react';
import { Product, InventoryItem, SellerInventoryItem, Seller, ExitNote } from '../types';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { sellerService } from '../services/sellerService';
import { exitNoteService } from '../services/exitNoteService';
import toast from 'react-hot-toast';

const WarehouseEcuador: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [committedStock, setCommittedStock] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ecuador');
  const [showModal, setShowModal] = useState(false);
  const [showExitNoteModal, setShowExitNoteModal] = useState(false);
  const [sellerInventory, setSellerInventory] = useState<SellerInventoryItem[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [exitNoteFormData, setExitNoteFormData] = useState({
    sellerId: '',
    notes: ''
  });
  const [exitNoteItems, setExitNoteItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>>([]);
  const [exitNoteSkuSearch, setExitNoteSkuSearch] = useState('');
  const [isCreatingExitNote, setIsCreatingExitNote] = useState(false);

  // Estados para edición y eliminación
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    quantity: 0,
    cost: 0,
    unitPrice: 0,
    location: '',
    status: 'stock' as 'stock' | 'in-transit' | 'delivered'
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [deleteReason, setDeleteReason] = useState<'error' | 'permanent'>('error');

  const locations = ['ecuador', 'all'];

  useEffect(() => {
    loadData();
  }, []);

  // Detectar cuando se escanea un código de barras en el modal de nota de salida
  useEffect(() => {
    if (!showExitNoteModal) return;

    const trimmedSku = exitNoteSkuSearch.trim();
    if (trimmedSku.length < 8) return;

    // Esperar un momento para que termine el escaneo completo
    const timer = setTimeout(() => {
      // Verificar que el valor no haya cambiado (escaneo completo)
      if (exitNoteSkuSearch.trim() === trimmedSku) {
        handleBarcodeScanExitNote(trimmedSku);
      }
    }, 500); // Esperar 500ms después del último cambio

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitNoteSkuSearch, showExitNoteModal]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, inventoryData, exitNotesData] = await Promise.all([
        productService.getAll(),
        inventoryService.getAll(),
        exitNoteService.getAll()
      ]);
      setProducts(productsData);
      setInventory(inventoryData);

      // Calcular stock comprometido (pending/in-transit)
      const committed: Record<string, number> = {};
      exitNotesData.forEach(note => {
        const s = (note.status || '').toLowerCase();
        if (s === 'pending' || s === 'in-transit') {
          note.items.forEach(item => {
            const pid = item.productId;
            committed[pid] = (committed[pid] || 0) + (item.quantity || 0);
          });
        }
      });
      setCommittedStock(committed);
    } catch (error) {
      toast.error('Error al cargar datos de bodega Ecuador');
    } finally {
      setLoading(false);
    }
  };

  const getInventoryForProduct = (productId: string) => {
    return inventory.find(item => item.productId === productId);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedLocation === 'all') {
      return matchesSearch;
    }

    const inventoryItem = getInventoryForProduct(product.id);

    // Verificar si está en Ecuador y si YA LLEGÓ (no está en tránsito ni pendiente)
    const isEcuador = inventoryItem?.location?.toLowerCase().includes('ecuador') || inventoryItem?.location === 'Ecuador';
    const status = (inventoryItem?.status || '').toLowerCase();
    const isArrived = status !== 'in-transit' && status !== 'pending';

    return matchesSearch && isEcuador && isArrived;
  });

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { color: 'text-red-600', bg: 'bg-red-100', text: 'Sin Stock' };
    if (quantity < 10) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Bajo Stock' };
    return { color: 'text-green-600', bg: 'bg-green-100', text: 'En Stock' };
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    setLoadingModal(true);
    try {
      const [inventoryData, sellersData] = await Promise.all([
        sellerInventoryService.getAll(),
        sellerService.getAll()
      ]);
      setSellerInventory(inventoryData);
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading seller inventory:', error);
      toast.error('Error al cargar inventario de vendedores');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleOpenExitNoteModal = async () => {
    setShowExitNoteModal(true);
    setExitNoteFormData({ sellerId: '', notes: '' });
    setExitNoteItems([]);
    setExitNoteSkuSearch('');
    try {
      const sellersData = await sellerService.getAll();
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Error al cargar vendedores');
    }
  };

  const getEcuadorStock = (productId: string): number => {
    const inventoryItem = inventory.find(item =>
      item.productId === productId &&
      (item.location?.toLowerCase().includes('ecuador') || item.location === 'Ecuador')
    );
    return inventoryItem?.quantity || 0;
  };

  const handleAddProductToExitNote = (product: Product) => {
    const availableStock = getEcuadorStock(product.id);
    if (availableStock === 0) {
      toast.error(`No hay stock disponible en Bodega Ecuador para ${product.name}`);
      return;
    }

    const selectedSeller = sellers.find(s => s.id === exitNoteFormData.sellerId);
    let unitPrice = product.salePrice1;
    if (selectedSeller) {
      unitPrice = selectedSeller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
    }

    const existingItem = exitNoteItems.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= availableStock) {
        toast.error(`Stock insuficiente. Disponible: ${availableStock}`);
        return;
      }
      setExitNoteItems(exitNoteItems.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setExitNoteItems([...exitNoteItems, {
        productId: product.id,
        quantity: 1,
        unitPrice: unitPrice
      }]);
    }
    setExitNoteSkuSearch('');
    toast.success(`Producto agregado: ${product.name}`);
  };

  const handleBarcodeScanExitNote = (barcode: string) => {
    const product = products.find(p => p.sku === barcode);
    if (!product) {
      toast.error(`No se encontró producto con SKU: ${barcode}`);
      setExitNoteSkuSearch('');
      return;
    }
    handleAddProductToExitNote(product);
  };

  const removeItemFromExitNote = (index: number) => {
    setExitNoteItems(exitNoteItems.filter((_, i) => i !== index));
  };

  const updateExitNoteItemQuantity = (index: number, quantity: number) => {
    const newItems = [...exitNoteItems];
    const productId = newItems[index].productId;
    const availableStock = getEcuadorStock(productId);

    if (quantity > availableStock) {
      toast.error(`Stock insuficiente. Disponible: ${availableStock}`);
      return;
    }

    if (quantity < 1) {
      toast.error('La cantidad debe ser al menos 1');
      return;
    }

    newItems[index].quantity = quantity;
    setExitNoteItems(newItems);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditFormData({
      quantity: item.quantity,
      cost: item.cost,
      unitPrice: item.unitPrice,
      location: item.location,
      status: item.status
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      // Calcular nuevos totales
      const newTotalCost = editFormData.cost * editFormData.quantity;
      const newTotalPrice = editFormData.unitPrice * editFormData.quantity;
      const newTotalValue = newTotalCost;

      await inventoryService.update(editingItem.id, {
        quantity: editFormData.quantity,
        cost: editFormData.cost,
        unitPrice: editFormData.unitPrice,
        totalCost: newTotalCost,
        totalPrice: newTotalPrice,
        totalValue: newTotalValue,
        location: editFormData.location,
        status: editFormData.status
      });

      // Recargar datos
      await loadData();
      toast.success('Inventario actualizado correctamente');
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Error al actualizar inventario');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditFormData({
      quantity: 0,
      cost: 0,
      unitPrice: 0,
      location: '',
      status: 'stock'
    });
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
    setDeleteReason('error'); // Por defecto "eliminado por error"
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (deleteReason === 'error') {
        // Eliminar por error: solo eliminar el registro de inventario sin afectar contabilidad
        await inventoryService.delete(itemToDelete.id);
        toast.success('Producto eliminado del inventario (marcado como eliminado por error)');
      } else {
        // Eliminación permanente
        await inventoryService.delete(itemToDelete.id);
        toast.success('Producto eliminado permanentemente del inventario');
      }

      // Recargar datos
      await loadData();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast.error('Error al eliminar el producto del inventario');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
    setDeleteReason('error');
  };

  const handleCreateEcuadorExitNote = async () => {
    try {
      if (exitNoteItems.length === 0) {
        toast.error('Debe agregar al menos un producto');
        return;
      }

      const selectedSeller = sellers.find(s => s.id === exitNoteFormData.sellerId);
      if (!selectedSeller) {
        toast.error('Por favor selecciona un vendedor');
        return;
      }

      // Recargar inventario actualizado ANTES de validar
      const currentInventory = await inventoryService.getAll();

      // Validar stock disponible con datos actualizados de la base de datos
      for (const item of exitNoteItems) {
        const ecuadorInventoryItem = currentInventory.find(inv =>
          inv.productId === item.productId &&
          (inv.location?.toLowerCase().includes('ecuador') || inv.location === 'Ecuador')
        );

        const availableStock = ecuadorInventoryItem?.quantity || 0;

        if (availableStock < item.quantity) {
          const product = products.find(p => p.id === item.productId);
          toast.error(`Stock insuficiente para ${product?.name}. Disponible: ${availableStock}, Solicitado: ${item.quantity}`);
          return;
        }
      }

      setIsCreatingExitNote(true);

      // Actualizar el estado local con el inventario actualizado
      setInventory(currentInventory);

      // Construir items de la nota de salida
      const exitNoteItemsData = await Promise.all(exitNoteItems.map(async (item) => {
        const product = await productService.getById(item.productId);
        if (!product) {
          throw new Error(`Producto ${item.productId} no encontrado`);
        }
        return {
          id: `${Date.now()}-${Math.random()}`,
          productId: item.productId,
          product,
          quantity: item.quantity,
          size: product.size || '',
          weight: product.weight || 0,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity
        };
      }));

      const totalPrice = exitNoteItemsData.reduce((sum, item) => sum + item.totalPrice, 0);

      // Crear la nota de salida con status 'delivered' directamente
      const exitNoteData: Omit<ExitNote, 'id'> = {
        number: `NS-ECU-${Date.now()}`,
        date: new Date(),
        sellerId: selectedSeller.id,
        seller: selectedSeller.name,
        customer: selectedSeller.name,
        items: exitNoteItemsData,
        totalPrice,
        status: 'delivered', // Directamente entregada
        notes: `Nota de salida desde Bodega Ecuador${exitNoteFormData.notes ? ` - ${exitNoteFormData.notes}` : ''}`,
        createdAt: new Date(),
        createdBy: 'admin',
        receivedAt: new Date() // Marcar como recibida inmediatamente
      };

      const createdExitNoteId = await exitNoteService.create(exitNoteData);

      // Reducir stock de Bodega Ecuador y agregar al inventario del vendedor
      // Usar el inventario actualizado que recargamos antes de validar
      for (const item of exitNoteItemsData) {
        // 1. Obtener el item de inventario actualizado de la base de datos
        const currentInventoryUpdated = await inventoryService.getAll();
        const ecuadorInventoryItem = currentInventoryUpdated.find(inv =>
          inv.productId === item.productId &&
          (inv.location?.toLowerCase().includes('ecuador') || inv.location === 'Ecuador')
        );

        if (!ecuadorInventoryItem) {
          throw new Error(`Producto ${item.product.name} no encontrado en Bodega Ecuador`);
        }

        // Validar stock ANTES de restar
        if (ecuadorInventoryItem.quantity < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.product.name}. Disponible: ${ecuadorInventoryItem.quantity}, Solicitado: ${item.quantity}`);
        }

        const newQuantity = ecuadorInventoryItem.quantity - item.quantity;

        await inventoryService.update(ecuadorInventoryItem.id, {
          quantity: newQuantity,
          totalCost: ecuadorInventoryItem.cost * newQuantity,
          totalPrice: ecuadorInventoryItem.unitPrice * newQuantity,
          totalValue: ecuadorInventoryItem.cost * newQuantity
        });

        // 2. Agregar al inventario del vendedor con status 'delivered' directamente
        const existingItems = await sellerInventoryService.getBySeller(selectedSeller.id);
        const existingItem = existingItems.find(si => si.productId === item.productId);

        if (existingItem) {
          // Actualizar cantidad existente
          const newQuantity = existingItem.quantity + item.quantity;
          const newTotalValue = item.unitPrice * newQuantity;
          await sellerInventoryService.update(existingItem.id, {
            quantity: newQuantity,
            unitPrice: item.unitPrice,
            totalValue: newTotalValue,
            status: 'delivered' // Marcar como entregado directamente
          });
        } else {
          // Crear nuevo item con status 'delivered' directamente
          await sellerInventoryService.create({
            sellerId: selectedSeller.id,
            productId: item.productId,
            product: item.product,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalValue: item.unitPrice * item.quantity,
            status: 'delivered' // Estado entregado directamente
          });
        }
      }

      toast.success(`Nota de salida Ecuador creada exitosamente. Inventario del vendedor actualizado.`);

      // Recargar datos
      await loadData();

      // Cerrar modal y limpiar formulario
      setShowExitNoteModal(false);
      setExitNoteFormData({ sellerId: '', notes: '' });
      setExitNoteItems([]);
      setExitNoteSkuSearch('');
    } catch (error) {
      console.error('Error creating Ecuador exit note:', error);
      toast.error('Error al crear la nota de salida Ecuador');
    } finally {
      setIsCreatingExitNote(false);
    }
  };

  // Filtrar productos disponibles en Bodega Ecuador para el modal de nota de salida
  const availableEcuadorProducts = useMemo(() => {
    // Obtener SOLO productos que están físicamente en Bodega Ecuador, sin importar el filtro de ubicación
    return products.filter(product => {
      const stock = getEcuadorStock(product.id);
      return stock > 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, inventory]);

  // Agrupar productos por productId y mostrar qué vendedores tienen cada uno
  const groupedProducts = useMemo(() => {
    // Crear mapa de vendedores para búsqueda rápida
    const sellersMap = new Map(sellers.map(s => [s.id, s.name]));

    return sellerInventory.reduce((acc, item) => {
      const productId = item.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product: item.product,
          sellers: []
        };
      }
      acc[productId].sellers.push({
        sellerId: item.sellerId,
        sellerName: sellersMap.get(item.sellerId) || 'Vendedor desconocido',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalValue: item.totalValue,
        status: item.status
      });
      return acc;
    }, {} as Record<string, { product: Product; sellers: Array<{ sellerId: string; sellerName: string; quantity: number; unitPrice: number; totalValue: number; status: string }> }>);
  }, [sellerInventory, sellers]);

  const filteredGroupedProducts = useMemo(() => {
    return Object.entries(groupedProducts).filter(([productId, data]) => {
      const product = data.product;
      const matchesSearch = product.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(modalSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [groupedProducts, modalSearchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Filtrar productos que están en Ecuador y YA LLEGARON, ajustando stock por notas pendientes
  const ecuadorProducts = inventory
    .filter(item => {
      const location = item.location?.toLowerCase() || '';
      const status = (item.status || '').toLowerCase();
      const isEcuador = location.includes('ecuador') || item.location === 'Ecuador';
      const isArrived = status !== 'in-transit' && status !== 'pending';
      return isEcuador && isArrived;
    })
    .map(item => {
      const committed = committedStock[item.productId] || 0;
      const realQty = Math.max(0, item.quantity - committed);

      // Ajustar valor proporcionalmente
      const ratio = item.quantity > 0 ? realQty / item.quantity : 0;

      return {
        ...item,
        quantity: realQty,
        totalValue: (item.totalValue || 0) * ratio
      };
    })
    .filter(item => item.quantity > 0); // Solo contar como producto en bodega si tiene stock real > 0

  const lowStockCount = ecuadorProducts.filter(item => item.quantity < 10).length;
  const noStockCount = ecuadorProducts.filter(item => item.quantity === 0).length;
  const totalValue = ecuadorProducts.reduce((sum, item) => sum + (item.totalValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Flag className="h-8 w-8 text-yellow-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bodega Ecuador</h1>
            <p className="text-gray-600">Gestiona la ubicación y stock de productos en Ecuador</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleOpenModal()}
            className="btn-secondary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </button>
          <button
            onClick={() => handleOpenExitNoteModal()}
            className="btn-primary flex items-center"
          >
            <Truck className="h-4 w-4 mr-2" />
            Nueva Nota de Salida Ecuador
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Productos en Ecuador</p>
              <p className="text-2xl font-bold text-gray-900">{ecuadorProducts.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Package className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Bajo Stock</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <Package className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sin Stock</p>
              <p className="text-2xl font-bold text-gray-900">{noStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos en Ecuador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="input-field"
            >
              <option value="ecuador">Bodega Ecuador</option>
              <option value="all">Todas las ubicaciones</option>
            </select>
            <button className="btn-secondary flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const inventoryItem = getInventoryForProduct(product.id);
                const stockStatus = getStockStatus(inventoryItem?.quantity || 0);

                // Solo mostrar productos que están en Ecuador o si se seleccionó "all"
                if (selectedLocation === 'ecuador' && inventoryItem &&
                  !inventoryItem.location?.toLowerCase().includes('ecuador') &&
                  inventoryItem.location !== 'Ecuador') {
                  return null;
                }

                // Solo mostrar productos que tienen un item de inventario válido
                if (!inventoryItem) {
                  return null;
                }

                // Calcular cantidad disponible restando lo comprometido
                const committed = committedStock[product.id] || 0;
                const displayQuantity = Math.max(0, (inventoryItem.quantity || 0) - committed);

                // Si el usuario quiere que NO aparezcan los productos de notas pendientes, 
                // podríamos retornar null aquí si displayQuantity <= 0.
                // Vamos a probar ocultándolos si quedan en 0 por compromiso.
                if (displayQuantity <= 0) return null;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={product.imageUrl}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {displayQuantity} unidades
                        {committed > 0 && (
                          <span className="ml-2 text-xs text-orange-500" title={`${committed} unidades comprometidas en notas pendientes`}>
                            (-{committed})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Flag className="h-4 w-4 text-yellow-400 mr-2" />
                        <div className="text-sm text-gray-900">{inventoryItem.location || 'Sin ubicación'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${inventoryItem.totalValue.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(inventoryItem)}
                          className="text-green-600 hover:text-green-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(inventoryItem)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="card text-center py-12">
          <Flag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos en Ecuador</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron productos con ese criterio en la bodega de Ecuador.' : 'No hay productos registrados en la bodega de Ecuador.'}
          </p>
        </div>
      )}

      {/* Modal de Inventario de Vendedores */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowModal(false)}
            ></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              {/* Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-primary-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Inventario de Vendedores
                      </h3>
                      <p className="text-sm text-gray-500">
                        Productos en inventario de todos los vendedores
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="input-field pl-10 w-full"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                {loadingModal ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  </div>
                ) : filteredGroupedProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {modalSearchTerm ? 'No se encontraron productos con ese criterio.' : 'No hay productos en inventario de vendedores.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGroupedProducts.map(([productId, data]) => {
                      const product = data.product;
                      const totalQuantity = data.sellers.reduce((sum, s) => sum + s.quantity, 0);
                      const totalValue = data.sellers.reduce((sum, s) => sum + s.totalValue, 0);

                      return (
                        <div key={productId} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                          {/* Product Image */}
                          <div className="flex justify-center mb-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-32 w-32 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="h-32 w-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Package className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                              {product.name}
                            </h4>
                            <p className="text-xs text-gray-500 mb-1">SKU: {product.sku}</p>
                            <p className="text-xs text-gray-500">Categoría: {product.category}</p>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-blue-50 rounded p-2">
                              <p className="text-xs text-gray-600">Cantidad Total</p>
                              <p className="text-lg font-bold text-blue-600">{totalQuantity}</p>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <p className="text-xs text-gray-600">Valor Total</p>
                              <p className="text-lg font-bold text-green-600">${totalValue.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Sellers List */}
                          <div className="border-t border-gray-200 pt-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">
                              Vendedores ({data.sellers.length}):
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {data.sellers.map((seller, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{seller.sellerName}</p>
                                    <p className="text-gray-500">
                                      {seller.quantity} unidades - ${seller.totalValue.toLocaleString()}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs ${seller.status === 'stock' ? 'bg-green-100 text-green-700' :
                                    seller.status === 'in-transit' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                    {seller.status === 'stock' ? 'En Stock' :
                                      seller.status === 'in-transit' ? 'En Tránsito' :
                                        'Entregado'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Total de productos únicos: {filteredGroupedProducts.length}
                  </p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nota de Salida Ecuador */}
      {showExitNoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowExitNoteModal(false)}
            ></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:max-h-[90vh]">
              {/* Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-6 w-6 text-primary-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Nueva Nota de Salida Ecuador
                      </h3>
                      <p className="text-sm text-gray-500">
                        Crear nota de salida desde Bodega Ecuador directamente al vendedor
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExitNoteModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                {/* Form */}
                <div className="space-y-4">
                  {/* Seleccionar Vendedor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendedor *
                    </label>
                    <select
                      value={exitNoteFormData.sellerId}
                      onChange={(e) => {
                        setExitNoteFormData({ ...exitNoteFormData, sellerId: e.target.value });
                        // Actualizar precios cuando cambia el vendedor
                        const selectedSeller = sellers.find(s => s.id === e.target.value);
                        if (selectedSeller) {
                          setExitNoteItems(exitNoteItems.map(item => {
                            const product = products.find(p => p.id === item.productId);
                            if (product) {
                              const price = selectedSeller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
                              return { ...item, unitPrice: price };
                            }
                            return item;
                          }));
                        }
                      }}
                      className="input-field w-full"
                      required
                    >
                      <option value="">Seleccionar vendedor</option>
                      {sellers.map(seller => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Buscar Producto por SKU */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Producto por SKU
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Escanear o escribir SKU..."
                        value={exitNoteSkuSearch}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setExitNoteSkuSearch(newValue);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmedValue = exitNoteSkuSearch.trim();
                            if (trimmedValue.length >= 8) {
                              handleBarcodeScanExitNote(trimmedValue);
                            }
                          }
                        }}
                        className="input-field pl-10 w-full"
                      />
                    </div>
                  </div>

                  {/* Lista de Productos Disponibles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Productos Disponibles en Bodega Ecuador
                    </label>
                    <div className="border border-gray-200 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
                      {availableEcuadorProducts.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            No hay productos disponibles en Bodega Ecuador
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {availableEcuadorProducts.map(product => {
                            const stock = getEcuadorStock(product.id);
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleAddProductToExitNote(product)}
                                disabled={stock === 0}
                                className={`text-left p-3 border-2 rounded-lg transition-all hover:shadow-md bg-white ${stock === 0
                                  ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                  : 'border-gray-200 hover:bg-gray-50 hover:border-primary-500'
                                  }`}
                              >
                                {/* Imagen del producto */}
                                <div className="w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="h-12 w-12 text-gray-400" />
                                  )}
                                </div>

                                {/* Información del producto */}
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                  {product.size && (
                                    <p className="text-xs text-gray-600 font-medium">
                                      <span className="text-gray-500">Talla:</span> {product.size}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <div>
                                      <p className={`text-xs font-semibold ${stock > 0 ? 'text-primary-600' : 'text-red-600'
                                        }`}>
                                        Stock: {stock}
                                      </p>
                                    </div>
                                    {stock > 0 && (
                                      <div className="bg-primary-100 rounded-full p-1.5">
                                        <Plus className="h-4 w-4 text-primary-600" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Productos Agregados */}
                  {exitNoteItems.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Productos en la Nota
                      </label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Talla</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {exitNoteItems.map((item, index) => {
                              const product = products.find(p => p.id === item.productId);
                              const stock = getEcuadorStock(item.productId);
                              return (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {product?.name || 'Producto no encontrado'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    {product?.size || '-'}
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max={stock}
                                      value={item.quantity}
                                      onChange={(e) => updateExitNoteItemQuantity(index, parseInt(e.target.value) || 1)}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    ${item.unitPrice.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                    ${(item.unitPrice * item.quantity).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2">
                                    <button
                                      onClick={() => removeItemFromExitNote(index)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                Total:
                              </td>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                ${exitNoteItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toLocaleString()}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={exitNoteFormData.notes}
                      onChange={(e) => setExitNoteFormData({ ...exitNoteFormData, notes: e.target.value })}
                      className="input-field w-full"
                      rows={3}
                      placeholder="Notas adicionales sobre esta nota de salida..."
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {exitNoteItems.length} producto(s) agregado(s)
                  </p>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowExitNoteModal(false)}
                      className="btn-secondary"
                      disabled={isCreatingExitNote}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateEcuadorExitNote}
                      disabled={isCreatingExitNote || exitNoteItems.length === 0 || !exitNoteFormData.sellerId}
                      className="btn-primary"
                    >
                      {isCreatingExitNote ? 'Creando...' : 'Crear Nota de Salida'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Editar Inventario Bodega Ecuador
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Información del producto */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900">{editingItem.product?.name || 'Producto'}</h4>
                  <p className="text-sm text-gray-600">SKU: {editingItem.product?.sku || 'N/A'}</p>
                </div>

                {/* Formulario de edición */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      value={editFormData.location}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo Unitario
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.cost}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Unitario
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.unitPrice}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                      className="input-field"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as 'stock' | 'in-transit' | 'delivered' }))}
                      className="input-field"
                    >
                      <option value="stock">En Stock</option>
                      <option value="in-transit">En Tránsito</option>
                      <option value="delivered">Entregado</option>
                    </select>
                  </div>
                </div>

                {/* Totales calculados */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Costo Total:</span>
                      <p className="font-medium">${(editFormData.cost * editFormData.quantity).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Precio Total:</span>
                      <p className="font-medium">${(editFormData.unitPrice * editFormData.quantity).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor Total:</span>
                      <p className="font-medium">${(editFormData.cost * editFormData.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminación */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Eliminar Producto del Inventario
                </h3>
                <button
                  onClick={handleCancelDelete}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Información del producto */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900">{itemToDelete.product?.name || 'Producto'}</h4>
                  <p className="text-sm text-gray-600">SKU: {itemToDelete.product?.sku || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Cantidad: {itemToDelete.quantity}</p>
                  <p className="text-sm text-gray-600">Ubicación: {itemToDelete.location}</p>
                </div>

                {/* Opciones de eliminación */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de eliminación:
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="deleteReason"
                        value="error"
                        checked={deleteReason === 'error'}
                        onChange={() => setDeleteReason('error')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Eliminado por Error</div>
                        <div className="text-sm text-gray-600">
                          El producto se eliminará del inventario pero NO afectará presupuestos ni contabilidad.
                          Útil cuando el producto fue agregado por error o no debería estar en inventario.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="deleteReason"
                        value="permanent"
                        checked={deleteReason === 'permanent'}
                        onChange={() => setDeleteReason('permanent')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Eliminación Permanente</div>
                        <div className="text-sm text-gray-600">
                          El producto se eliminará permanentemente del inventario.
                          Esta acción no se puede deshacer.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Advertencia */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Advertencia:</strong> Esta acción eliminará el producto del inventario.
                    {deleteReason === 'error'
                      ? ' No se afectarán presupuestos ni contabilidad.'
                      : ' Esta acción es permanente.'}
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelDelete}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseEcuador;

