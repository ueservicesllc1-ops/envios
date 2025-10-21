import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Truck, CheckCircle, XCircle, X, Package, Scan } from 'lucide-react';
import { ExitNote, Product, Seller } from '../types';
import { exitNoteService } from '../services/exitNoteService';
import { productService } from '../services/productService';
import { sellerService } from '../services/sellerService';
import { inventoryService } from '../services/inventoryService';
import SimpleBarcodeScanner from '../components/SimpleBarcodeScanner';
import toast from 'react-hot-toast';

const ExitNotes: React.FC = () => {
  const [notes, setNotes] = useState<ExitNote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [viewingNote, setViewingNote] = useState<ExitNote | null>(null);
  const [formData, setFormData] = useState({
    sellerId: '',
    notes: ''
  });
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: number;
    size: string;
    unitPrice: number;
  }>>([]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const [notesData, productsData, sellersData, inventoryData] = await Promise.all([
        exitNoteService.getAll(),
        productService.getAll(),
        sellerService.getAll(),
        inventoryService.getAll()
      ]);
      setNotes(notesData);
      setProducts(productsData);
      setSellers(sellersData);
      setInventory(inventoryData);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'delivered':
        return 'Enviado';
      case 'received':
        return 'Recibido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getAvailableStock = (productId: string): number => {
    const inventoryItem = inventory.find(item => item.productId === productId);
    return inventoryItem ? inventoryItem.quantity : 0;
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, size: '', unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleBarcodeScan = (barcode: string) => {
    // Buscar producto por SKU
    const product = products.find(p => p.sku === barcode);
    if (!product) {
      toast.error(`No se encontró producto con SKU: ${barcode}`);
      return;
    }
    
    // Verificar si el producto ya está en los items
    const existingItem = items.find(item => item.productId === product.id);
    if (existingItem) {
      toast.error('Este producto ya está agregado a la nota');
      return;
    }
    
    // Obtener precio según el vendedor seleccionado
    const selectedSeller = sellers.find(s => s.id === formData.sellerId);
    let unitPrice = product.salePrice1; // Precio por defecto
    
    if (selectedSeller) {
      unitPrice = selectedSeller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
    }
    
    // Agregar producto automáticamente
    const newItem = {
      productId: product.id,
      quantity: 1,
      size: product.size || '',
      unitPrice: unitPrice
    };
    
    setItems([...items, newItem]);
    toast.success(`Producto agregado: ${product.name}`);
    setShowScanner(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Si cambió el producto, actualizar el precio y talla según el vendedor
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      const selectedSeller = sellers.find(s => s.id === formData.sellerId);
      if (product && selectedSeller) {
        // Usar el precio según el tipo de precio del vendedor
        const price = selectedSeller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
        newItems[index].unitPrice = price;
        newItems[index].size = product.size || '';
      }
    }
    
    setItems(newItems);
  };

  const updateSellerPrices = () => {
    if (formData.sellerId) {
      const selectedSeller = sellers.find(s => s.id === formData.sellerId);
      if (selectedSeller) {
        const newItems = items.map(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const price = selectedSeller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
            return { ...item, unitPrice: price };
          }
          return item;
        });
        setItems(newItems);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (items.length === 0) {
        toast.error('Debe agregar al menos un producto');
        return;
      }

      const selectedSeller = sellers.find(s => s.id === formData.sellerId);
      if (!selectedSeller) {
        toast.error('Por favor selecciona un vendedor');
        return;
      }

      // Validar stock disponible
      for (const item of items) {
        const availableStock = getAvailableStock(item.productId);
        if (availableStock < item.quantity) {
          const product = products.find(p => p.id === item.productId);
          toast.error(`Stock insuficiente para ${product?.name}. Disponible: ${availableStock}, Solicitado: ${item.quantity}`);
          return;
        }
        if (availableStock === 0) {
          const product = products.find(p => p.id === item.productId);
          toast.error(`${product?.name} no tiene stock disponible. Debe crear una nota de entrada primero.`);
          return;
        }
      }

      // Crear items con información completa del producto
      const exitNoteItems = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) throw new Error('Producto no encontrado');
        
        return {
          id: Date.now().toString() + Math.random(),
          productId: item.productId,
          product: product,
          quantity: item.quantity,
          size: item.size,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice
        };
      });

      const totalPrice = exitNoteItems.reduce((sum, item) => sum + item.totalPrice, 0);

      const exitNoteData = {
        number: `NS-${Date.now()}`,
        date: new Date(),
        sellerId: selectedSeller.id,
        seller: selectedSeller.name,
        customer: selectedSeller.name, // El vendedor es el cliente
        items: exitNoteItems,
        totalPrice: totalPrice,
        status: 'pending' as const,
        notes: formData.notes,
        createdAt: new Date(),
        createdBy: 'admin' // TODO: Obtener del usuario actual
      };

      await exitNoteService.create(exitNoteData);
      
      // Actualizar stock después de crear la nota
      for (const item of items) {
        await inventoryService.updateStockAfterExit(item.productId, item.quantity);
      }
      
      toast.success('Nota de salida creada correctamente');
      setShowModal(false);
      setFormData({ sellerId: '', notes: '' });
      setItems([]);
      loadNotes();
    } catch (error) {
      console.error('Error creating exit note:', error);
      toast.error('Error al crear la nota de salida');
    }
  };

  const handleStatusChange = async (noteId: string, newStatus: 'delivered' | 'received' | 'cancelled') => {
    try {
      await exitNoteService.update(noteId, { status: newStatus });
      toast.success(`Estado actualizado a: ${getStatusText(newStatus)}`);
      loadNotes();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta nota de salida?')) {
      try {
        await exitNoteService.delete(noteId);
        toast.success('Nota de salida eliminada correctamente');
        loadNotes();
      } catch (error) {
        console.error('Error deleting exit note:', error);
        toast.error('Error al eliminar la nota de salida');
      }
    }
  };

  const filteredNotes = notes.filter(note =>
    note.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Notas de Salida</h1>
          <p className="text-gray-600">Gestiona las ventas y entregas a vendedores</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Nota
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Notas</p>
              <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Truck className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {notes.filter(n => n.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entregadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {notes.filter(n => n.status === 'delivered').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Truck className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                ${notes.reduce((sum, note) => sum + note.totalPrice, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {filteredNotes.length} notas encontradas
            </span>
          </div>
        </div>
      </div>

      {/* Notes Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Vendedor</th>
                <th className="table-header">Items</th>
                <th className="table-header">Total</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNotes.map((note, index) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {new Date(note.date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{note.seller}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {note.items.length} items
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      ${note.totalPrice.toLocaleString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                      {getStatusText(note.status)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingNote(note)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {note.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(note.id, 'delivered')}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Marcar como enviado"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {note.status === 'delivered' && (
                        <button
                          onClick={() => handleStatusChange(note.id, 'received')}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Marcar como recibido"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {note.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange(note.id, 'cancelled')}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Cancelar"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Eliminar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 && (
        <div className="card text-center py-12">
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de salida</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron notas con ese criterio.' : 'Comienza creando tu primera nota de salida.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Nota de Salida
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear nota de salida */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Nota de Salida</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendedor *
                </label>
                <select
                  required
                  value={formData.sellerId}
                  onChange={(e) => {
                    setFormData({ ...formData, sellerId: e.target.value });
                    // Actualizar precios cuando cambie el vendedor
                    setTimeout(() => updateSellerPrices(), 100);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar vendedor</option>
                  {sellers.map(seller => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name} - {seller.priceType === 'price2' ? 'Precio 2' : 'Precio 1'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Productos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Productos</h4>
                    <p className="text-sm text-gray-500">Solo productos disponibles en inventario</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={addItem}
                      className="btn-secondary flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Producto
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="btn-primary flex items-center"
                      title="Escanear código de barras"
                    >
                      <Scan className="h-4 w-4 mr-2" />
                      Escanear
                    </button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No hay productos agregados</p>
                    <p className="text-xs text-gray-400">Haz clic en "Agregar Producto" para comenzar</p>
                    {inventory.length === 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No hay inventario disponible. Debe crear notas de entrada primero.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <select
                            required
                            value={item.productId}
                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Seleccionar producto</option>
                            {products.map(product => {
                              const availableStock = getAvailableStock(product.id);
                              return (
                                <option 
                                  key={product.id} 
                                  value={product.id}
                                  disabled={availableStock === 0}
                                >
                                  {product.name} - {product.sku} {product.size ? `(Talla: ${product.size})` : ''} - Stock: {availableStock}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="w-20">
                          <input
                            type="text"
                            value={item.size}
                            onChange={(e) => updateItem(index, 'size', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Talla"
                            title="Talla del producto"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="1"
                            max={item.productId ? getAvailableStock(item.productId) : undefined}
                            required
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Cant."
                            title={item.productId ? `Stock disponible: ${getAvailableStock(item.productId)}` : ''}
                          />
                          {item.productId && (
                            <div className="text-xs text-gray-500 mt-1">
                              Stock: {getAvailableStock(item.productId)}
                            </div>
                          )}
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Precio de venta"
                            title="Precio de venta del vendedor (se carga automáticamente según el tipo de precio)"
                          />
                        </div>
                        <div className="w-24 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            ${(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              {items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-gray-900">
                      ${items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Notas adicionales sobre la entrega"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={items.length === 0}
                >
                  Crear Nota de Salida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver detalles de la nota de salida */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de la Nota de Salida
              </h3>
              <button
                onClick={() => setViewingNote(null)}
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
                    Número de Nota
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingNote.number}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(viewingNote.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingNote.status)}`}>
                    {getStatusText(viewingNote.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendedor
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingNote.seller}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingNote.customer}
                  </p>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Productos</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Talla
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {viewingNote.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                SKU: {item.product.sku}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">
                              {item.size || 'Sin talla'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">
                              ${item.unitPrice.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">
                              ${item.totalPrice.toLocaleString()}
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
                  <span className="text-lg font-medium text-gray-900">Total de la Nota:</span>
                  <span className="text-xl font-bold text-gray-900">
                    ${viewingNote.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notas */}
              {viewingNote.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingNote.notes}
                  </p>
                </div>
              )}

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Creación
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(viewingNote.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {viewingNote.receivedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Recepción
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(viewingNote.receivedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                onClick={() => setViewingNote(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lector de códigos de barras */}
      <SimpleBarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Escanear Código de Barras del Producto"
      />
    </div>
  );
};

export default ExitNotes;
