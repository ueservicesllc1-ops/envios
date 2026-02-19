import React, { useState, useEffect } from 'react';
import { Package, MapPin, Search, Filter, Plus, Eye, Edit, X, Truck } from 'lucide-react';
import { Product, InventoryItem } from '../types';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { sellerService } from '../services/sellerService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { exitNoteService } from '../services/exitNoteService';
import { Seller, ExitNote } from '../types';
import toast from 'react-hot-toast';

const Warehouse: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showExitNoteModal, setShowExitNoteModal] = useState(false);
  const [isCreatingExitNote, setIsCreatingExitNote] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
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

  // Estados para edición
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    quantity: 0,
    cost: 0,
    unitPrice: 0,
    location: '',
    status: 'stock' as 'stock' | 'in-transit' | 'delivered'
  });

  const locations = ['all'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, inventoryData] = await Promise.all([
        productService.getAll(),
        inventoryService.getAll()
      ]);
      setProducts(productsData);
      setInventory(inventoryData);
    } catch (error) {
      toast.error('Error al cargar datos de bodega');
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
    return matchesSearch && inventoryItem?.location === selectedLocation;
  });

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { color: 'text-red-600', bg: 'bg-red-100', text: 'Sin Stock' };
    if (quantity < 10) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Bajo Stock' };
    return { color: 'text-green-600', bg: 'bg-green-100', text: 'En Stock' };
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

  const handleOpenExitNoteModal = async (initialProduct?: Product) => {
    setShowExitNoteModal(true);
    setExitNoteFormData({ sellerId: '', notes: '' });

    if (initialProduct) {
      const inventoryItem = getInventoryForProduct(initialProduct.id);
      const availableStock = inventoryItem?.quantity || 0;

      if (availableStock > 0) {
        setExitNoteItems([{
          productId: initialProduct.id,
          quantity: 1,
          unitPrice: initialProduct.salePrice1
        }]);
      } else {
        toast.error(`No hay stock disponible para ${initialProduct.name}`);
        setExitNoteItems([]);
      }
    } else {
      setExitNoteItems([]);
    }

    setExitNoteSkuSearch('');
    try {
      const sellersData = await sellerService.getAll();
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Error al cargar vendedores');
    }
  };

  const handleCreateExitNote = async () => {
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

      setIsCreatingExitNote(true);

      // Reload inventory to get fresh data
      const currentInventory = await inventoryService.getAll();

      // Build exit note items data
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

      const exitNoteData: Omit<ExitNote, 'id'> = {
        number: `NS-USA-${Date.now()}`,
        date: new Date(),
        sellerId: selectedSeller.id,
        seller: selectedSeller.name,
        customer: selectedSeller.name,
        items: exitNoteItemsData,
        totalPrice,
        status: 'delivered', // Mark as delivered so it enters seller inventory
        notes: `Transferencia desde Bodega USA${exitNoteFormData.notes ? ` - ${exitNoteFormData.notes}` : ''}`,
        createdAt: new Date(),
        createdBy: 'admin',
        receivedAt: new Date()
      };

      const noteId = await exitNoteService.create(exitNoteData);

      // Process Inventory Updates
      for (const item of exitNoteItemsData) {
        // 1. Deduct from Warehouse (Principal/USA)
        // Find existing inventory item to get correct location if possible, default to 'Bodega Principal'
        const existingInv = currentInventory.find(inv => inv.productId === item.productId);
        const locationStr = existingInv?.location || 'Bodega Principal';

        await inventoryService.updateStockAfterExit(
          item.productId,
          item.quantity,
          noteId,
          selectedSeller.id,
          locationStr
        );

        // 2. Add to Seller Inventory
        await sellerInventoryService.addToSellerInventory(
          selectedSeller.id,
          item.productId,
          item.product,
          item.quantity,
          item.unitPrice
        );
      }

      toast.success(`Transferencia de Bodega USA a ${selectedSeller.name} completada`);
      await loadData();
      setShowExitNoteModal(false);
      setExitNoteFormData({ sellerId: '', notes: '' });
      setExitNoteItems([]);

    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('Error al procesar la transferencia');
    } finally {
      setIsCreatingExitNote(false);
    }
  };

  const handleBarcodeScanExitNote = (barcode: string) => {
    const product = products.find(p => p.sku === barcode);
    if (!product) {
      toast.error(`No se encontró producto con SKU: ${barcode}`);
      setExitNoteSkuSearch('');
      return;
    }

    // Check stock
    const inventoryItem = getInventoryForProduct(product.id);
    const availableStock = inventoryItem?.quantity || 0;

    if (availableStock === 0) {
      toast.error(`No hay stock disponible para ${product.name}`);
      setExitNoteSkuSearch('');
      return;
    }

    // Add to items
    const selectedSeller = sellers.find(s => s.id === exitNoteFormData.sellerId);
    let unitPrice = product.salePrice1;
    if (selectedSeller) {
      unitPrice = selectedSeller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
    }

    const existingItem = exitNoteItems.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= availableStock) {
        toast.error(`Stock insuficiente. Disponible: ${availableStock}`);
        setExitNoteSkuSearch('');
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

  const removeItemFromExitNote = (index: number) => {
    setExitNoteItems(exitNoteItems.filter((_, i) => i !== index));
  };

  const updateExitNoteItemQuantity = (index: number, quantity: number) => {
    const newItems = [...exitNoteItems];
    const productId = newItems[index].productId;
    const inventoryItem = getInventoryForProduct(productId);
    const availableStock = inventoryItem?.quantity || 0;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bodega Principal</h1>
          <p className="text-gray-600">Gestiona la ubicación y stock de productos en Bodega USA</p>
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
              <p className="text-sm font-medium text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">
                ${inventory.reduce((sum, item) => sum + (item.totalValue || 0), 0).toLocaleString()}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {inventory.filter(item => item.quantity < 10).length}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {inventory.filter(item => item.quantity === 0).length}
              </p>
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
                placeholder="Buscar productos..."
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
              {locations.map(location => (
                <option key={location} value={location}>
                  {location === 'all' ? 'Todas las ubicaciones' : location}
                </option>
              ))}
            </select>
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

                if (!inventoryItem) return null;

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
                      <div className="text-sm text-gray-900">{inventoryItem.quantity} unidades</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{inventoryItem.location || 'Sin ubicación'}</div>
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
                          onClick={() => handleOpenExitNoteModal(product)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Transferir a Vendedor"
                        >
                          <Truck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(inventoryItem)}
                          className="text-green-600 hover:text-green-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
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
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron productos con ese criterio.' : 'No hay productos en esta ubicación.'}
          </p>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Inventario - {products.find(p => p.id === editingItem.productId)?.name}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Unitario
                  </label>
                  <input
                    type="number"
                    value={editFormData.cost}
                    onChange={(e) => setEditFormData({ ...editFormData, cost: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Unitario
                  </label>
                  <input
                    type="number"
                    value={editFormData.unitPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación / Bodega
                  </label>
                  <select
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Seleccionar ubicación</option>
                    <option value="Bodega Principal">Bodega Principal (USA)</option>
                    <option value="Bodega Ecuador">Bodega Ecuador</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="stock">En Stock</option>
                    <option value="in-transit">En Tránsito</option>
                    <option value="delivered">Entregado</option>
                  </select>
                </div>
              </div>

              {/* Preview de totales */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Vista Previa</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Costo Total:</p>
                    <p className="font-semibold text-gray-900">
                      ${(editFormData.cost * editFormData.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Precio Total:</p>
                    <p className="font-semibold text-gray-900">
                      ${(editFormData.unitPrice * editFormData.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Margen Potencial:</p>
                    <p className="font-semibold text-green-600">
                      ${((editFormData.unitPrice - editFormData.cost) * editFormData.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
      )}

      {/* Modal de Nota de Salida USA */}
      {showExitNoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowExitNoteModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:max-h-[90vh]">
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-6 w-6 text-primary-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Transferir a Vendedor (Desde Bodega USA)
                      </h3>
                      <p className="text-sm text-gray-500">
                        Crear nota de salida y transferir stock al vendedor
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

              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendedor *
                    </label>
                    <select
                      value={exitNoteFormData.sellerId}
                      onChange={(e) => {
                        setExitNoteFormData({ ...exitNoteFormData, sellerId: e.target.value });
                        // Update prices based on seller price type
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
                        onChange={(e) => setExitNoteSkuSearch(e.target.value)}
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

                  {/* Added Items List */}
                  {exitNoteItems.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Productos a Transferir
                      </label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cant.</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">P. Unit</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {exitNoteItems.map((item, index) => {
                              const product = products.find(p => p.id === item.productId);
                              const invItem = getInventoryForProduct(item.productId);
                              const maxStock = invItem?.quantity || 0;

                              return (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{product?.name}</span>
                                      <span className="text-xs text-gray-500">{product?.sku}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max={maxStock}
                                      value={item.quantity}
                                      onChange={(e) => updateExitNoteItemQuantity(index, parseInt(e.target.value) || 1)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">${item.unitPrice}</td>
                                  <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                    ${(item.unitPrice * item.quantity).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <button
                                      onClick={() => removeItemFromExitNote(index)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas (opcional)
                    </label>
                    <textarea
                      value={exitNoteFormData.notes}
                      onChange={(e) => setExitNoteFormData({ ...exitNoteFormData, notes: e.target.value })}
                      className="input-field w-full"
                      rows={3}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowExitNoteModal(false)}
                  className="btn-secondary"
                  disabled={isCreatingExitNote}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateExitNote}
                  disabled={isCreatingExitNote || exitNoteItems.length === 0 || !exitNoteFormData.sellerId}
                  className="btn-primary"
                >
                  {isCreatingExitNote ? 'Procesando...' : 'Transferir Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
