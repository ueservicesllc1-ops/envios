import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, CheckCircle, XCircle, FileText, X, Trash2, Scan, Edit } from 'lucide-react';
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
  const [viewingNote, setViewingNote] = useState<EntryNote | null>(null);
  const [editingNote, setEditingNote] = useState<EntryNote | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
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
  
  // Estados para edición
  const [editFormData, setEditFormData] = useState({
    supplier: '',
    location: ''
  });
  const [editItems, setEditItems] = useState<Array<{
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
      quantity: 1,
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
    setItems(prevItems => {
      const newItems = [...prevItems];
      
      // Si cambió el producto, cargar el costo por defecto ANTES de actualizar
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          newItems[index] = { 
            ...newItems[index], 
            [field]: value,
            cost: product.cost,
            unitPrice: product.cost
          };
        } else {
          newItems[index] = { ...newItems[index], [field]: value };
        }
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      
      return newItems;
    });
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

  const handleEdit = (note: EntryNote) => {
    setEditingNote(note);
    setEditFormData({
      supplier: note.supplier,
      location: note.location || ''
    });
    setEditItems(note.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      cost: item.cost,
      unitPrice: item.unitPrice
    })));
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingNote || editItems.length === 0) return;

    try {
      // Calcular totales
      const totalCost = editItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
      
      // Mapear editItems a EntryNoteItem[]
      const entryNoteItems = editItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          id: `${Date.now()}-${Math.random()}`, // ID temporal
          productId: item.productId,
          product: product || {} as Product,
          quantity: item.quantity,
          cost: item.cost,
          unitPrice: item.unitPrice,
          totalCost: item.cost * item.quantity,
          totalPrice: item.unitPrice * item.quantity
        };
      });

      // Obtener los items originales para comparar
      const originalItems = editingNote.items;
      
      // Actualizar la nota de entrada
      await entryNoteService.update(editingNote.id, {
        supplier: editFormData.supplier,
        location: editFormData.location,
        items: entryNoteItems,
        totalCost: totalCost
      });

      // PRIMERO: Revertir todo el stock de la nota original
      for (const originalItem of originalItems) {
        await inventoryService.removeStock(
          originalItem.productId, 
          originalItem.quantity
        );
      }

      // SEGUNDO: Aplicar el nuevo stock de la nota editada
      for (const newItem of entryNoteItems) {
        await inventoryService.addStock(
          newItem.productId, 
          newItem.quantity, 
          newItem.cost, 
          newItem.unitPrice, 
          editFormData.location
        );
      }

      toast.success('Nota de entrada y inventario actualizados correctamente');
      setShowEditModal(false);
      setEditingNote(null);
      setEditFormData({ supplier: '', location: '' });
      setEditItems([]);
      loadNotes();
    } catch (error) {
      console.error('Error updating entry note:', error);
      toast.error('Error al actualizar la nota de entrada');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingNote(null);
    setEditFormData({ supplier: '', location: '' });
    setEditItems([]);
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
                        onClick={() => setViewingNote(note)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(note)}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
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
                        <div className="flex items-end gap-2">
                          <div className="w-12">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              #
                            </label>
                            <input
                              type="text"
                              value={index + 1}
                              className="input-field bg-gray-100 w-full text-center"
                              disabled
                              placeholder={`${index + 1}`}
                            />
                          </div>

                          <div className="w-1/2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Producto
                            </label>
                            <select
                              required
                              value={item.productId}
                              onChange={(e) => updateItem(index, 'productId', e.target.value)}
                              className="input-field w-full"
                            >
                              <option value="">Seleccionar producto</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} - {product.sku} {product.size ? `(Talla: ${product.size})` : ''} {product.color ? `- ${product.color}` : ''} {product.color2 ? `/${product.color2}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-44">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              SKU
                            </label>
                            <input
                              type="text"
                              value={products.find(p => p.id === item.productId)?.sku || ''}
                              className="input-field bg-gray-100 w-full"
                              disabled
                              placeholder="SKU"
                            />
                          </div>

                          <div className="w-16">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="input-field w-full"
                              placeholder="0"
                            />
                          </div>

                          <div className="w-20">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Costo/U
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.cost}
                              onChange={(e) => updateItem(index, 'cost', parseFloat(e.target.value) || 0)}
                              className="input-field w-full"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="w-24">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <input
                              type="text"
                              value={`$${(item.cost * item.quantity).toFixed(2)}`}
                              className="input-field bg-gray-100 w-full"
                              disabled
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Eliminar producto"
                            >
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
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

      {/* Modal para ver detalles de la nota */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de la Nota de Entrada #{viewingNote.number}
              </h3>
              <button
                onClick={() => setViewingNote(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Proveedor</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingNote.supplier}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingNote.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(viewingNote.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingNote.status)}`}>
                  {getStatusText(viewingNote.status)}
                </span>
              </div>

              {/* Productos */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Productos</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unit.</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {viewingNote.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.product?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.product?.sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${item.cost.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${item.totalCost.toFixed(2)}
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
                    ${viewingNote.totalCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && editingNote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Editar Nota de Entrada #{editingNote.number}
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Información general */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proveedor
                    </label>
                    <input
                      type="text"
                      value={editFormData.supplier}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      className="input-field"
                      required
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
                      required
                    />
                  </div>
                </div>

                {/* Productos */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Productos</h4>
                  <div className="space-y-4">
                    {editItems.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <div key={index} className="flex items-end gap-2 p-4 border rounded-lg">
                          <div className="w-12">
                            <label className="block text-xs font-medium text-gray-700 mb-1">#</label>
                            <input
                              type="text"
                              value={index + 1}
                              className="input-field bg-gray-100 w-full text-center"
                              disabled
                            />
                          </div>
                          
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Producto</label>
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[index].productId = e.target.value;
                                const selectedProduct = products.find(p => p.id === e.target.value);
                                if (selectedProduct) {
                                  newItems[index].cost = selectedProduct.cost;
                                  newItems[index].unitPrice = selectedProduct.salePrice1;
                                }
                                setEditItems(newItems);
                              }}
                              className="input-field w-full"
                              required
                            >
                              <option value="">Seleccionar producto</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} - {product.sku} {product.size ? `(Talla: ${product.size})` : ''} {product.color ? `- ${product.color}` : ''} {product.color2 ? `/${product.color2}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="w-20">
                            <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                            <input
                              type="text"
                              value={product?.sku || ''}
                              className="input-field bg-gray-100 w-full"
                              disabled
                            />
                          </div>
                          
                          <div className="w-16">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[index].quantity = parseInt(e.target.value) || 0;
                                setEditItems(newItems);
                              }}
                              className="input-field w-full"
                              required
                            />
                          </div>
                          
                          <div className="w-20">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Costo/U</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cost}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[index].cost = parseFloat(e.target.value) || 0;
                                setEditItems(newItems);
                              }}
                              className="input-field w-full"
                              required
                            />
                          </div>
                          
                          <div className="w-24">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                            <input
                              type="text"
                              value={`$${(item.cost * item.quantity).toFixed(2)}`}
                              className="input-field bg-gray-100 w-full"
                              disabled
                            />
                          </div>
                          
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = editItems.filter((_, i) => i !== index);
                                setEditItems(newItems);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Eliminar producto"
                            >
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setEditItems([...editItems, {
                          productId: '',
                          quantity: 1,
                          cost: 0,
                          unitPrice: 0
                        }]);
                      }}
                      className="btn-secondary flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Producto
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-primary-600">
                      ${editItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toFixed(2)}
                    </span>
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
                  disabled={editItems.length === 0}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntryNotes;
