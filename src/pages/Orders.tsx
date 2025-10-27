import React, { useState, useEffect } from 'react';
import { X, Package, CheckCircle, XCircle, Clock, Eye, Edit, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { orderService, Order, OrderItem } from '../services/orderService';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [editingApprovedItems, setEditingApprovedItems] = useState<OrderItem[]>([]);
  const [isEditingApproval, setIsEditingApproval] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderService.getAll();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status'], notes?: string) => {
    try {
      await orderService.updateStatus(orderId, newStatus, notes);
      await loadOrders();
      toast.success(`Pedido ${newStatus === 'approved' ? 'aprobado' : newStatus === 'rejected' ? 'rechazado' : 'actualizado'} exitosamente`);
      setShowOrderModal(false);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el pedido');
    }
  };

  const handleApproveWithDetails = async (orderId: string) => {
    try {
      // Crear los items aprobados con las cantidades modificadas
      const approvedItems = editingApprovedItems.map(item => ({
        ...item,
        // Aquí se puede agregar lógica adicional para los items aprobados
      }));

      await orderService.updateStatus(orderId, 'approved', adminNotes, approvedItems);
      await loadOrders();
      toast.success('Pedido aprobado con detalles exitosamente');
      setShowOrderModal(false);
      setIsEditingApproval(false);
      setEditingApprovedItems([]);
      setAdminNotes('');
    } catch (error) {
      console.error('Error approving order with details:', error);
      toast.error('Error al aprobar el pedido');
    }
  };

  const handleStartEditingApproval = () => {
    if (selectedOrder) {
      setEditingApprovedItems([...selectedOrder.items]);
      setIsEditingApproval(true);
    }
  };

  const handleUpdateApprovedQuantity = (index: number, newQuantity: number) => {
    const updatedItems = [...editingApprovedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity,
      subtotal: newQuantity * updatedItems[index].unitPrice
    };
    setEditingApprovedItems(updatedItems);
  };

  const handleRemoveApprovedItem = (index: number) => {
    const updatedItems = editingApprovedItems.filter((_, i) => i !== index);
    setEditingApprovedItems(updatedItems);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const filteredOrders = orders.filter(order => {
    const statusMatch = statusFilter === 'all' || order.status === statusFilter;
    const sellerMatch = sellerFilter === 'all' || order.sellerId === sellerFilter;
    return statusMatch && sellerMatch;
  });

  const uniqueSellers = Array.from(new Set(orders.map(order => order.sellerId)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
        <button
          onClick={loadOrders}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors flex items-center"
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
              <option value="completed">Completados</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Vendedor</label>
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los Vendedores</option>
              {uniqueSellers.map(sellerId => {
                const seller = orders.find(order => order.sellerId === sellerId);
                return (
                  <option key={sellerId} value={sellerId}>
                    {seller?.sellerName || sellerId}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pedidos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter === 'all' ? 'No se han generado pedidos aún.' : 'No hay pedidos con el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Pedido #{order.id?.slice(-8)}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'approved' ? 'bg-green-100 text-green-800' :
                        order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status === 'pending' ? 'Pendiente' :
                         order.status === 'approved' ? 'Aprobado' :
                         order.status === 'rejected' ? 'Rechazado' : 'Completado'}
                      </span>
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-primary-600 hover:text-primary-800 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    <p><strong>Vendedor:</strong> {order.sellerName} ({order.sellerEmail})</p>
                    <p><strong>Fecha:</strong> {order.createdAt.toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    <p><strong>Total:</strong> ${order.totalAmount.toFixed(2)} | <strong>Productos:</strong> {order.totalItems} | <strong>Cantidad:</strong> {order.totalQuantity}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Detalles del Pedido */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Detalles del Pedido #{selectedOrder.id?.slice(-8)}</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Información del Pedido */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información del Pedido</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">ID:</span> {selectedOrder.id}
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span> 
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedOrder.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedOrder.status === 'pending' ? 'Pendiente' :
                       selectedOrder.status === 'approved' ? 'Aprobado' :
                       selectedOrder.status === 'rejected' ? 'Rechazado' : 'Completado'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Vendedor:</span> {selectedOrder.sellerName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedOrder.sellerEmail}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {selectedOrder.createdAt.toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> ${selectedOrder.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Productos del Pedido */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Productos Solicitados</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start">
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
                              <span className="font-medium">Estado:</span> 
                              <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {item.status === 'stock' ? 'En Stock' : 'Sin Stock'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">${item.subtotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas del Administrador */}
              {selectedOrder.notes && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Notas del Administrador</h4>
                  <p className="text-blue-800">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Acciones del Administrador */}
              {selectedOrder.status === 'pending' && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-3">Acciones del Administrador</h4>
                  
                  {!isEditingApproval ? (
                    <div className="flex space-x-3">
                      <button
                        onClick={handleStartEditingApproval}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Aprobar con Detalles
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedOrder.id!, 'approved')}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar Todo
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Motivo del rechazo (opcional):');
                          handleStatusChange(selectedOrder.id!, 'rejected', notes || undefined);
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar Pedido
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Modo de Aprobación Detallada:</strong> Ajusta las cantidades que se enviarán realmente. 
                          Los productos no seleccionados o con cantidad 0 no se enviarán.
                        </p>
                      </div>
                      
                      {/* Lista de productos para aprobar */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-900">Productos a Enviar:</h5>
                        {editingApprovedItems.map((item, index) => (
                          <div key={index} className="bg-white border rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <h6 className="font-medium text-gray-900">{item.productName}</h6>
                                <p className="text-sm text-gray-500">SKU: {item.sku} | Ubicación: {item.location}</p>
                                <div className="mt-2 flex items-center space-x-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Cantidad Solicitada:</label>
                                    <span className="ml-2 text-sm text-gray-600">{item.quantity}</span>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Cantidad a Enviar:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={item.quantity}
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateApprovedQuantity(index, parseInt(e.target.value) || 0)}
                                      className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">Precio Unit.:</span>
                                    <span className="ml-2 text-sm text-gray-600">${item.unitPrice.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                                    <span className="ml-2 text-sm font-bold text-green-600">${item.subtotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveApprovedItem(index)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Eliminar del envío"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Notas del administrador */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notas del Administrador (opcional):
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Agrega notas sobre el pedido, cambios realizados, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      {/* Resumen de la aprobación */}
                      <div className="bg-green-50 p-3 rounded-md">
                        <h6 className="font-medium text-green-900 mb-2">Resumen de la Aprobación:</h6>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Productos a Enviar:</span> {editingApprovedItems.length}
                          </div>
                          <div>
                            <span className="font-medium">Cantidad Total:</span> {editingApprovedItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </div>
                          <div>
                            <span className="font-medium">Total a Enviar:</span> ${editingApprovedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Productos No Enviados:</span> {selectedOrder.items.length - editingApprovedItems.length}
                          </div>
                        </div>
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setIsEditingApproval(false);
                            setEditingApprovedItems([]);
                            setAdminNotes('');
                          }}
                          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleApproveWithDetails(selectedOrder.id!)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Aprobar con Detalles
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedOrder.status === 'approved' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">Pedido Aprobado</h4>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id!, 'completed')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Completado
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
