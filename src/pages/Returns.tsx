import React, { useState, useEffect } from 'react';
import { RotateCcw, Search, Eye, CheckCircle, XCircle, X, Package, User, Plus, Undo2 } from 'lucide-react';
import { Return, ReturnItem, Seller, SellerInventoryItem } from '../types';
import { returnService } from '../services/returnService';
import { sellerService } from '../services/sellerService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { exitNoteService } from '../services/exitNoteService';
import { ExitNote } from '../types';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Returns: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [viewingReturn, setViewingReturn] = useState<Return | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Estados para crear nota de devolución
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [exitNotes, setExitNotes] = useState<ExitNote[]>([]);
  const [selectedExitNoteId, setSelectedExitNoteId] = useState('');
  const [selectedExitNote, setSelectedExitNote] = useState<ExitNote | null>(null);
  const [sellerInventory, setSellerInventory] = useState<SellerInventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<SellerInventoryItem[]>([]);
  const [productsFromNote, setProductsFromNote] = useState<Array<{ productId: string; product: any; quantity: number; unitPrice: number; availableQuantity: number }>>([]);
  const [returnItems, setReturnItems] = useState<Array<{ productId: string; product: any; quantity: number; unitPrice: number; reason?: string }>>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) {
      return; // Esperar a que termine la carga de autenticación
    }
    if (!isAdmin) {
      toast.error('No tienes permisos para acceder a esta página');
      setLoading(false);
      return;
    }
    loadReturns();
  }, [isAdmin, authLoading]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const returnsData = await returnService.getAll();
      setReturns(returnsData);
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Error al cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const sellersData = await sellerService.getAll();
      setSellers(sellersData.filter(s => s.isActive));
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Error al cargar vendedores');
    }
  };

  const loadSellerInventory = async (sellerId: string) => {
    try {
      const inventory = await sellerInventoryService.getBySeller(sellerId);
      const availableInventory = inventory.filter(item => item.quantity > 0);
      setSellerInventory(availableInventory);
      setFilteredInventory(availableInventory);
    } catch (error) {
      console.error('Error loading seller inventory:', error);
      toast.error('Error al cargar inventario del vendedor');
    }
  };

  const loadExitNotes = async (sellerId: string) => {
    try {
      const notes = await exitNoteService.getBySeller(sellerId);
      // Solo mostrar notas que estén entregadas o recibidas
      const deliveredNotes = notes.filter(note =>
        note.status === 'delivered' || note.status === 'received'
      );
      setExitNotes(deliveredNotes);
    } catch (error) {
      console.error('Error loading exit notes:', error);
      toast.error('Error al cargar notas de salida');
    }
  };

  const loadProductsFromExitNote = async (exitNoteId: string) => {
    try {
      const note = await exitNoteService.getById(exitNoteId);
      if (!note) {
        toast.error('Nota de salida no encontrada');
        return;
      }

      setSelectedExitNote(note);

      // Obtener inventario actual del vendedor para verificar cantidades disponibles
      const currentInventory = await sellerInventoryService.getBySeller(selectedSellerId);

      // Crear lista de productos de la nota con sus cantidades disponibles
      const productsList = note.items.map(item => {
        // Buscar en el inventario actual cuánto stock hay disponible de este producto
        const inventoryItem = currentInventory.find(inv => inv.productId === item.productId);
        const availableQuantity = inventoryItem?.quantity || 0;

        return {
          productId: item.productId,
          product: item.product,
          quantity: item.quantity, // Cantidad original en la nota
          unitPrice: item.unitPrice,
          availableQuantity: availableQuantity // Cantidad disponible en inventario actual
        };
      });

      setProductsFromNote(productsList);
    } catch (error) {
      console.error('Error loading products from exit note:', error);
      toast.error('Error al cargar productos de la nota de salida');
    }
  };

  useEffect(() => {
    if (selectedSellerId) {
      loadSellerInventory(selectedSellerId);
      loadExitNotes(selectedSellerId);
      setReturnItems([]);
      setSelectedExitNoteId('');
    }
  }, [selectedSellerId]);

  useEffect(() => {
    if (selectedExitNoteId && selectedSellerId) {
      // Cargar productos directamente de la nota de salida
      loadProductsFromExitNote(selectedExitNoteId);
      // También mantener el filtro del inventario por si acaso
      const filtered = sellerInventory.filter(item => item.exitNoteId === selectedExitNoteId);
      setFilteredInventory(filtered);
    } else {
      // Mostrar todo el inventario si no hay filtro
      setFilteredInventory(sellerInventory);
      setProductsFromNote([]);
      setSelectedExitNote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExitNoteId, sellerInventory, selectedSellerId]);

  // Filtrar productos por búsqueda (nombre y SKU)
  const filteredProductsFromNote = productsFromNote.filter(item => {
    if (!productSearchTerm.trim()) return true;
    const searchLower = productSearchTerm.toLowerCase();
    return (
      item.product.name?.toLowerCase().includes(searchLower) ||
      item.product.sku?.toLowerCase().includes(searchLower)
    );
  });

  const filteredInventoryBySearch = filteredInventory.filter(item => {
    if (!productSearchTerm.trim()) return true;
    const searchLower = productSearchTerm.toLowerCase();
    return (
      item.product.name?.toLowerCase().includes(searchLower) ||
      item.product.sku?.toLowerCase().includes(searchLower)
    );
  });

  const handleAddProductToReturn = (item: SellerInventoryItem | { productId: string; product: any; quantity: number; unitPrice: number; availableQuantity?: number }) => {
    const existingItem = returnItems.find(ri => ri.productId === item.productId);
    if (existingItem) {
      toast.error('Este producto ya está en la lista de devolución');
      return;
    }

    // Verificar cantidad disponible
    const availableQty = 'availableQuantity' in item ? (item.availableQuantity ?? 0) : item.quantity;
    if (availableQty <= 0) {
      toast.error('No hay stock disponible para este producto');
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
      item.productId === productId ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateReturn = async () => {
    if (!selectedSellerId) {
      toast.error('Debes seleccionar un vendedor');
      return;
    }

    if (returnItems.length === 0) {
      toast.error('Debes agregar al menos un producto a la devolución');
      return;
    }

    // Validar cantidades
    for (const returnItem of returnItems) {
      // Buscar en el inventario actual del vendedor
      const inventoryItem = sellerInventory.find(item => item.productId === returnItem.productId);
      if (!inventoryItem || inventoryItem.quantity < returnItem.quantity) {
        toast.error(`La cantidad de ${returnItem.product.name} excede el inventario disponible. Disponible: ${inventoryItem?.quantity || 0}, Solicitado: ${returnItem.quantity}`);
        return;
      }
    }

    try {
      setIsCreating(true);
      const selectedSeller = sellers.find(s => s.id === selectedSellerId);
      if (!selectedSeller) {
        throw new Error('Vendedor no encontrado');
      }

      // Generar número de devolución
      const returnNumber = `DEV-${Date.now()}`;

      // Calcular total
      const totalValue = returnItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

      // Crear items de devolución
      const returnItemsData: ReturnItem[] = returnItems.map(item => ({
        id: item.productId,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        reason: item.reason
      }));

      // Crear la nota de devolución
      await returnService.createAdminReturn({
        number: returnNumber,
        sellerId: selectedSellerId,
        sellerName: selectedSeller.name,
        items: returnItemsData,
        totalValue,
        notes: returnNotes,
        createdAt: new Date()
      });

      // Limpiar formulario
      setSelectedSellerId('');
      setSelectedExitNoteId('');
      setSelectedExitNote(null);
      setProductsFromNote([]);
      setReturnItems([]);
      setReturnNotes('');
      setProductSearchTerm('');
      setShowCreateModal(false);

      // Recargar devoluciones
      await loadReturns();
    } catch (error: any) {
      console.error('Error creating return:', error);
      toast.error(error.message || 'Error al crear la nota de devolución');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (returnId: string) => {
    if (!isAdmin) {
      toast.error('No tienes permisos para aprobar devoluciones');
      return;
    }

    if (!window.confirm('¿Estás seguro de aprobar esta devolución? Los productos serán movidos a bodega Ecuador.')) {
      return;
    }

    try {
      await returnService.approve(returnId, 'admin');
      toast.success('Devolución aprobada exitosamente');
      await loadReturns();
      setViewingReturn(null);
    } catch (error) {
      console.error('Error approving return:', error);
      toast.error('Error al aprobar la devolución');
    }
  };

  const handleReject = async (returnId: string) => {
    if (!isAdmin) {
      toast.error('No tienes permisos para rechazar devoluciones');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Por favor ingresa una razón para el rechazo');
      return;
    }

    if (!window.confirm('¿Estás seguro de rechazar esta devolución?')) {
      return;
    }

    try {
      await returnService.reject(returnId, 'admin', rejectionReason);
      toast.success('Devolución rechazada');
      await loadReturns();
      setViewingReturn(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting return:', error);
      toast.error('Error al rechazar la devolución');
    }
  };

  const handleRestore = async (returnId: string) => {
    if (!isAdmin) {
      toast.error('No tienes permisos para restaurar devoluciones');
      return;
    }

    if (!window.confirm('¿Estás seguro de restaurar esta devolución? Los productos volverán al inventario del vendedor, se reducirá el stock de Bodega Ecuador y se incrementará la deuda del vendedor.')) {
      return;
    }

    try {
      await returnService.restoreReturn(returnId);
      await loadReturns();
      setViewingReturn(null);
    } catch (error) {
      console.error('Error restoring return:', error);
      toast.error('Error al restaurar la devolución');
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

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch =
      returnItem.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.sellerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') {
      return matchesSearch;
    }

    return matchesSearch && returnItem.status === statusFilter;
  });

  const pendingCount = returns.filter(r => r.status === 'pending').length;
  const approvedCount = returns.filter(r => r.status === 'approved').length;
  const rejectedCount = returns.filter(r => r.status === 'rejected').length;
  const totalValue = returns.reduce((sum, r) => sum + r.totalValue, 0);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Acceso Denegado</h3>
          <p className="mt-2 text-sm text-gray-500">
            No tienes permisos para acceder a esta página. Solo los administradores pueden gestionar devoluciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devoluciones</h1>
          <p className="text-gray-600">Gestiona las devoluciones de productos de vendedores</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              loadSellers();
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Nota de Devolución
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Devoluciones</p>
              <p className="text-2xl font-bold text-gray-900">{returns.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aprobadas</p>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalValue.toLocaleString()}
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
                placeholder="Buscar devoluciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Número</th>
                <th className="table-header">Vendedor</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Productos</th>
                <th className="table-header">Valor Total</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReturns.map((returnItem, index) => (
                <tr key={returnItem.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {returnItem.number}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{returnItem.sellerName}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {new Date(returnItem.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {returnItem.items.length} producto(s)
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      ${returnItem.totalValue.toLocaleString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusText(returnItem.status)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingReturn(returnItem)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {returnItem.status === 'pending' && isAdmin && (
                        <>
                          <button
                            onClick={() => handleApprove(returnItem.id)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Aprobar devolución"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setViewingReturn(returnItem);
                              setRejectionReason('');
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Rechazar devolución"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {returnItem.status === 'approved' && isAdmin && (
                        <button
                          onClick={() => handleRestore(returnItem.id)}
                          className="p-1 text-gray-400 hover:text-orange-600"
                          title="Restaurar devolución (revertir cambios)"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredReturns.length === 0 && (
        <div className="card text-center py-12">
          <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay devoluciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'No se encontraron devoluciones con ese criterio.'
              : 'No hay devoluciones registradas.'}
          </p>
        </div>
      )}

      {/* Modal para ver detalles */}
      {viewingReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de la Devolución
              </h3>
              <div className="flex items-center space-x-2">
                {viewingReturn.status === 'pending' && isAdmin && (
                  <>
                    <button
                      onClick={() => handleApprove(viewingReturn.id)}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => {
                        if (rejectionReason.trim()) {
                          handleReject(viewingReturn.id);
                        } else {
                          toast.error('Por favor ingresa una razón para el rechazo');
                        }
                      }}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors flex items-center"
                      disabled={!rejectionReason.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </button>
                  </>
                )}
                {viewingReturn.status === 'approved' && isAdmin && (
                  <button
                    onClick={() => handleRestore(viewingReturn.id)}
                    className="px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors flex items-center"
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    Restaurar Devolución
                  </button>
                )}
                <button
                  onClick={() => {
                    setViewingReturn(null);
                    setRejectionReason('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendedor
                </label>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex-1">
                    {viewingReturn.sellerName}
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

              {/* Campo para razón de rechazo si está pendiente */}
              {viewingReturn.status === 'pending' && isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón de Rechazo (si aplica)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ingresa la razón por la cual se rechaza esta devolución..."
                  />
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
                onClick={() => {
                  setViewingReturn(null);
                  setRejectionReason('');
                }}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear nota de devolución */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Nota de Devolución</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSellerId('');
                  setSelectedExitNoteId('');
                  setSelectedExitNote(null);
                  setProductsFromNote([]);
                  setReturnItems([]);
                  setReturnNotes('');
                  setProductSearchTerm('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Seleccionar vendedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendedor *
                </label>
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="input-field"
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

              {/* Filtrar por nota de salida */}
              {selectedSellerId && exitNotes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por Nota de Salida (opcional)
                  </label>
                  <select
                    value={selectedExitNoteId}
                    onChange={(e) => setSelectedExitNoteId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Todas las notas de salida</option>
                    {exitNotes.map(note => (
                      <option key={note.id} value={note.id}>
                        {note.number} - {new Date(note.date).toLocaleDateString()} - ${note.totalPrice.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Productos de la nota de salida seleccionada */}
              {selectedSellerId && selectedExitNoteId && productsFromNote.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Productos de la Nota de Salida: {selectedExitNote?.number}
                      <span className="ml-2 text-xs text-gray-500">
                        (Todos los productos de esta nota)
                      </span>
                    </label>
                  </div>
                  {/* Campo de búsqueda */}
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="input-field pl-10 w-full"
                      />
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {filteredProductsFromNote.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          No se encontraron productos con "{productSearchTerm}"
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProductsFromNote.map((item) => (
                          <button
                            key={item.productId}
                            type="button"
                            onClick={() => handleAddProductToReturn(item)}
                            disabled={item.availableQuantity <= 0}
                            className={`text-left p-3 border-2 rounded-lg transition-all hover:shadow-md bg-white ${item.availableQuantity <= 0
                              ? 'border-gray-200 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:bg-gray-50 hover:border-primary-500'
                              }`}
                          >
                            {/* Imagen del producto */}
                            <div className="w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-12 w-12 text-gray-400" />
                              )}
                            </div>

                            {/* Información del producto */}
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                              <div className="flex items-center justify-between mt-2">
                                <div>
                                  <p className={`text-xs font-semibold ${item.availableQuantity > 0 ? 'text-primary-600' : 'text-red-600'
                                    }`}>
                                    Disponible: {item.availableQuantity} / En nota: {item.quantity}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    ${item.unitPrice.toLocaleString()}
                                  </p>
                                </div>
                                {item.availableQuantity > 0 && (
                                  <div className="bg-primary-100 rounded-full p-1.5">
                                    <Plus className="h-4 w-4 text-primary-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inventario del vendedor (cuando no hay nota seleccionada) */}
              {selectedSellerId && !selectedExitNoteId && filteredInventory.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productos Disponibles en Inventario
                  </label>
                  {/* Campo de búsqueda */}
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="input-field pl-10 w-full"
                      />
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {filteredInventoryBySearch.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          No se encontraron productos con "{productSearchTerm}"
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredInventoryBySearch.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAddProductToReturn(item)}
                            className="text-left p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-500 transition-all hover:shadow-md bg-white"
                          >
                            {/* Imagen del producto */}
                            <div className="w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-12 w-12 text-gray-400" />
                              )}
                            </div>

                            {/* Información del producto */}
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                              <div className="flex items-center justify-between mt-2">
                                <div>
                                  <p className="text-xs font-semibold text-primary-600">
                                    Stock: {item.quantity}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    ${item.unitPrice.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-primary-100 rounded-full p-1.5">
                                  <Plus className="h-4 w-4 text-primary-600" />
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedSellerId && selectedExitNoteId && productsFromNote.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No se encontraron productos en esta nota de salida
                  </p>
                </div>
              )}

              {selectedSellerId && !selectedExitNoteId && filteredInventory.length === 0 && sellerInventory.length > 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No hay productos disponibles en el inventario de este vendedor
                  </p>
                </div>
              )}

              {selectedSellerId && !selectedExitNoteId && sellerInventory.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No hay productos disponibles en el inventario de este vendedor</p>
                </div>
              )}

              {/* Productos seleccionados para devolución */}
              {returnItems.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productos a Devolver
                  </label>
                  <div className="space-y-3">
                    {returnItems.map((item) => {
                      const inventoryItem = sellerInventory.find(inv => inv.productId === item.productId);
                      const maxQuantity = inventoryItem?.quantity || 0;

                      return (
                        <div key={item.productId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                              <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                              <p className="text-xs text-gray-500">Precio unitario: ${item.unitPrice.toLocaleString()}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveReturnItem(item.productId)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cantidad (Max: {maxQuantity})
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={maxQuantity}
                                value={item.quantity}
                                onChange={(e) => handleUpdateReturnItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Razón (opcional)
                              </label>
                              <input
                                type="text"
                                value={item.reason || ''}
                                onChange={(e) => handleUpdateReturnItem(item.productId, 'reason', e.target.value)}
                                className="input-field text-sm"
                                placeholder="Razón de la devolución"
                              />
                            </div>
                          </div>
                          <div className="mt-2 text-right">
                            <p className="text-sm font-medium text-gray-900">
                              Subtotal: ${(item.quantity * item.unitPrice).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-gray-900">
                        ${returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Información adicional sobre la devolución"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSellerId('');
                  setSelectedExitNoteId('');
                  setSelectedExitNote(null);
                  setProductsFromNote([]);
                  setReturnItems([]);
                  setReturnNotes('');
                  setProductSearchTerm('');
                }}
                className="btn-secondary"
                disabled={isCreating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateReturn}
                className="btn-primary"
                disabled={isCreating || returnItems.length === 0 || !selectedSellerId}
              >
                {isCreating ? 'Creando...' : 'Crear Nota de Devolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;

