import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Package, Search, Filter, Plus, Edit, Eye, X } from 'lucide-react';
import { InventoryItem, Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  
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
  
  // Estados para modal de imagen
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    loadData();
    
    // Exponer función de limpieza en el objeto window para uso manual
    (window as any).cleanInvalidItems = async () => {
      try {
        console.log('Ejecutando limpieza manual...');
        const allInventory = await inventoryService.getAll();
        console.log(`Total items: ${allInventory.length}`);
        
        let removed = 0;
        for (const item of allInventory) {
          const product = item.product || {};
          const hasNoWeight = !product.weight || product.weight === 0;
          const hasNoCost = !item.cost || item.cost === 0;
          const hasNoPrice = !item.unitPrice || item.unitPrice === 0;
          
          if (hasNoWeight && hasNoCost && hasNoPrice) {
            console.log(`Eliminando: ${product.name || 'Sin nombre'} - Peso: ${product.weight}, Costo: ${item.cost}, Precio: ${item.unitPrice}`);
            await inventoryService.delete(item.id);
            removed++;
          }
        }
        
        console.log(`✅ Eliminados ${removed} items inválidos`);
        await loadData();
        alert(`Se eliminaron ${removed} productos sin datos válidos`);
      } catch (error) {
        console.error('Error:', error);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoryData, productsData] = await Promise.all([
        inventoryService.getAll(),
        productService.getAll()
      ]);
      
      // Combinar datos de inventario con productos
      const inventoryWithProducts = inventoryData.map(item => {
        const product = productsData.find(p => p.id === item.productId);
        return {
          ...item,
          product: product || {} as Product
        };
      });
      
      setInventory(inventoryWithProducts);
      setProducts(productsData);
    } catch (error) {
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
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

      // Actualizar el estado local
      setInventory(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...editFormData, totalCost: newTotalCost, totalPrice: newTotalPrice, totalValue: newTotalValue }
          : item
      ));

      toast.success('Inventario actualizado correctamente');
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
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

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleRegenerateInventory = async () => {
    if (window.confirm('¿Estás seguro de que quieres regenerar el inventario? Esto eliminará todo el inventario actual y lo reconstruirá desde las notas de entrada.')) {
      try {
        setLoading(true);
        await inventoryService.regenerateInventory();
        await loadData(); // Recargar datos
        toast.success('Inventario regenerado exitosamente');
      } catch (error) {
        console.error('Error regenerating inventory:', error);
        toast.error('Error al regenerar el inventario');
      } finally {
        setLoading(false);
      }
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { color: 'text-red-600', bg: 'bg-red-100', text: 'Sin Stock', priority: 1 };
    if (quantity < 10) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Bajo Stock', priority: 2 };
    if (quantity < 50) return { color: 'text-blue-600', bg: 'bg-blue-100', text: 'Stock Medio', priority: 3 };
    return { color: 'text-green-600', bg: 'bg-green-100', text: 'Stock Alto', priority: 4 };
  };

  const filteredInventory = inventory
    .filter(item => {
      const matchesSearch = item.product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterBy === 'all') return matchesSearch;
      if (filterBy === 'low-stock') return matchesSearch && item.quantity < 10;
      if (filterBy === 'out-of-stock') return matchesSearch && item.quantity === 0;
      if (filterBy === 'high-value') return matchesSearch && item.totalValue > 1000;
      
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.product.name?.localeCompare(b.product.name || '');
        case 'quantity':
          return b.quantity - a.quantity;
        case 'value':
          return b.totalValue - a.totalValue;
        case 'location':
          return a.location.localeCompare(b.location);
        default:
          return 0;
      }
    });

  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = inventory.filter(item => item.quantity < 10).length;
  const outOfStockItems = inventory.filter(item => item.quantity === 0).length;

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
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600">Control de stock y valoración de productos</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Ajuste de Inventario
          </button>
          <button 
            onClick={async () => {
              if (window.confirm('¿Estás seguro de que quieres eliminar los productos sin datos válidos (sin peso, costo ni precio)?')) {
                try {
                  setLoading(true);
                  await inventoryService.cleanInvalidInventoryItems();
                  await loadData();
                } catch (error) {
                  console.error('Error cleaning invalid items:', error);
                } finally {
                  setLoading(false);
                }
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center"
          >
            <Package className="h-4 w-4 mr-2" />
            Limpiar Sin Datos
          </button>
          <button 
            onClick={async () => {
              if (window.confirm('¿Estás seguro de que quieres limpiar los productos duplicados? Esta acción consolidará los productos duplicados en uno solo.')) {
                try {
                  setLoading(true);
                  await inventoryService.cleanDuplicateInventory();
                  await loadData();
                } catch (error) {
                  console.error('Error cleaning duplicates:', error);
                } finally {
                  setLoading(false);
                }
              }
            }}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors flex items-center"
          >
            <Package className="h-4 w-4 mr-2" />
            Limpiar Duplicados
          </button>
          <button 
            onClick={handleRegenerateInventory}
            className="btn-secondary flex items-center"
          >
            <Package className="h-4 w-4 mr-2" />
            Regenerar Inventario
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
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
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
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Bajo Stock</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
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
              <p className="text-2xl font-bold text-gray-900">{outOfStockItems}</p>
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
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos</option>
              <option value="low-stock">Bajo Stock</option>
              <option value="out-of-stock">Sin Stock</option>
              <option value="high-value">Alto Valor</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="name">Ordenar por Nombre</option>
              <option value="quantity">Ordenar por Cantidad</option>
              <option value="value">Ordenar por Valor</option>
              <option value="location">Ordenar por Ubicación</option>
            </select>
            <button className="btn-secondary flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Producto</th>
                <th className="table-header">SKU</th>
                <th className="table-header">Cantidad</th>
                <th className="table-header">Ubicación</th>
                <th className="table-header">Costo Unit.</th>
                <th className="table-header">Costo Total</th>
                <th className="table-header">Precio Unit.</th>
                <th className="table-header">Precio Total</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.quantity);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {item.product.imageUrl ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              onClick={() => handleImageClick(item.product.imageUrl!)}
                              title="Hacer clic para ver imagen grande"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.product.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{item.product.sku}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {item.quantity.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{item.location}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        ${item.cost.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        ${(item.cost * item.quantity).toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        ${item.product.salePrice1.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        ${(item.product.salePrice1 * item.quantity).toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-gray-400 hover:text-green-600"
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
      {filteredInventory.length === 0 && (
        <div className="card text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay inventario</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron productos con ese criterio.' : 'No hay productos en el inventario.'}
          </p>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Editar Inventario
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
                  <h4 className="font-medium text-gray-900">{editingItem.product.name}</h4>
                  <p className="text-sm text-gray-600">SKU: {editingItem.product.sku}</p>
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

      {/* Modal de Imagen */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-2xl max-h-[70vh] w-full mx-4 flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Imagen del producto"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
