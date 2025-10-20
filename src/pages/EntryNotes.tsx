import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, CheckCircle, XCircle, FileText, X, Trash2, Scan } from 'lucide-react';
import { EntryNote, Product } from '../types';
import { entryNoteService } from '../services/entryNoteService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import SimpleBarcodeScanner from '../components/SimpleBarcodeScanner';
import toast from 'react-hot-toast';

const EntryNotes: React.FC = () => {
  const [notes, setNotes] = useState<EntryNote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
    supplier: '',
    location: ''
  });
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: number;
    cost: number;
    unitPrice: number;
  }>>([]);

  useEffect(() => {
    loadNotes();
    loadProducts();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await entryNoteService.getAll();
      setNotes(data);
    } catch (error) {
      toast.error('Error al cargar notas de entrada');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

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

  const addItem = () => {
    setItems([...items, {
      productId: '',
      quantity: 0,
      cost: 0,
      unitPrice: 0
    }]);
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
    
    // Agregar producto automáticamente
    const newItem = {
      productId: product.id,
      quantity: 1,
      cost: product.cost,
      unitPrice: product.cost
    };
    
    setItems([...items, newItem]);
    toast.success(`Producto agregado: ${product.name}`);
    setShowScanner(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Debe agregar al menos un producto');
      return;
    }

    try {
      const entryNoteData = {
        supplier: formData.supplier,
        location: formData.location,
        items: items.map(item => ({
          id: '',
          productId: item.productId,
          product: products.find(p => p.id === item.productId) || {} as Product,
          quantity: item.quantity,
          cost: item.cost,
          unitPrice: item.unitPrice,
          totalCost: item.cost * item.quantity,
          totalPrice: item.unitPrice * item.quantity
        })),
        status: 'pending' as const,
        totalCost: items.reduce((sum, item) => sum + (item.cost * item.quantity), 0),
        totalPrice: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
        date: new Date(),
        createdBy: 'admin'
      };

      const noteId = await entryNoteService.create(entryNoteData);
      
      // Actualizar inventario para cada item
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await inventoryService.addStock(item.productId, item.quantity, item.cost, item.unitPrice, formData.location);
        }
      }

      toast.success('Nota de entrada creada correctamente');
      setShowModal(false);
      setFormData({ supplier: '', location: '' });
      setItems([]);
      loadNotes();
    } catch (error) {
      console.error('Error creating entry note:', error);
      toast.error('Error al crear nota de entrada');
    }
  };

  const openModal = () => {
    setFormData({ supplier: '', location: '' });
    setItems([]);
    setShowModal(true);
  };

  const filteredNotes = notes.filter(note =>
    note.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.supplier.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Notas de Entrada</h1>
          <p className="text-gray-600">Gestiona las compras y entradas de productos</p>
        </div>
        <button 
          onClick={openModal}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Nota
        </button>
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
                <th className="table-header">Producto</th>
                <th className="table-header">Cantidad</th>
                <th className="table-header">Proveedor</th>
                <th className="table-header">Ubicación</th>
                <th className="table-header">Costo</th>
                <th className="table-header">Total</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      {note.number}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {note.items.length > 0 ? note.items[0].product?.name || 'N/A' : 'N/A'}
                      {note.items.length > 1 && ` +${note.items.length - 1} más`}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {note.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{note.supplier}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{note.location || 'N/A'}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      ${note.items.length > 0 ? note.items[0].cost.toFixed(2) : '0.00'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      ${note.totalCost.toLocaleString()}
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
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de entrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron notas con ese criterio.' : 'Comienza creando tu primera nota de entrada.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Nota de Entrada
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear nota de entrada */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Nota de Entrada</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Información general */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proveedor
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="input-field"
                        placeholder="Nombre del proveedor"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ubicación
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="input-field"
                        placeholder="Bodega A, Almacén Central, etc."
                      />
                    </div>
                  </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Productos</h4>
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

                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700">Producto {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Producto
                            </label>
                            <select
                              required
                              value={item.productId}
                              onChange={(e) => updateItem(index, 'productId', e.target.value)}
                              className="input-field"
                            >
                              <option value="">Seleccionar producto</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              SKU
                            </label>
                            <input
                              type="text"
                              value={products.find(p => p.id === item.productId)?.sku || ''}
                              className="input-field bg-gray-100"
                              disabled
                              placeholder="Selecciona un producto"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="input-field"
                              placeholder="0"
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
                              required
                              value={item.cost}
                              onChange={(e) => updateItem(index, 'cost', parseFloat(e.target.value) || 0)}
                              className="input-field"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <input
                              type="text"
                              value={`$${(item.cost * item.quantity).toFixed(2)}`}
                              className="input-field bg-gray-100"
                              disabled
                            />
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          <div className="flex justify-center">
                            <span className="font-medium">Total: ${(item.cost * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>No hay productos agregados</p>
                    <p className="text-sm">Haz clic en "Agregar Producto" para comenzar</p>
                  </div>
                )}
              </div>

                  {/* Totales */}
                  {items.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Resumen</h4>
                      <div className="text-center">
                        <span className="text-lg font-bold text-gray-900">
                          Total: ${items.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

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
                  Crear Nota de Entrada
                </button>
              </div>
            </form>
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

export default EntryNotes;
