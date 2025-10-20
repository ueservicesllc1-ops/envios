import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Package, Search, Filter, Plus, Edit, Eye } from 'lucide-react';
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

  useEffect(() => {
    loadData();
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
        <button className="btn-primary flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Ajuste de Inventario
        </button>
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
                <th className="table-header">Precio Unit.</th>
                <th className="table-header">Valor Total</th>
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
                              className="h-10 w-10 rounded-lg object-cover"
                              src={item.product.imageUrl}
                              alt={item.product.name}
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
                        ${item.unitPrice.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        ${item.totalValue.toLocaleString()}
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
    </div>
  );
};

export default Inventory;
