import React, { useState, useEffect } from 'react';
import { Package, MapPin, Search, Filter, Plus, Eye, Edit, X } from 'lucide-react';
import { Product, InventoryItem } from '../types';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import toast from 'react-hot-toast';

const Warehouse: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');

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
    </div>
  );
};

export default Warehouse;
