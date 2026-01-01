import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package, User, CheckCircle, XCircle, Truck, Clock, Search, Filter, Ban, Check, Trash2, Edit, Save, Minus, Plus } from 'lucide-react';
import { onlineSaleService, OnlineSale } from '../services/onlineSaleService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { InventoryItem } from '../types';
import toast from 'react-hot-toast';
import { contactService, ContactMessage } from '../services/contactService';
import { MessageSquare, Mail, Phone, Trash } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { emailService } from '../services/emailService';
import { format, addDays } from 'date-fns';

const AdminStore: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'orders' | 'stock' | 'messages'>('orders');
    const [orders, setOrders] = useState<OnlineSale[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showTrackingModal, setShowTrackingModal] = useState(false);

    const [selectedOrder, setSelectedOrder] = useState<OnlineSale | null>(null);

    // Estados para edición
    const [editingOrder, setEditingOrder] = useState<OnlineSale | null>(null);
    const [editedItems, setEditedItems] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'orders') loadOrders();
        if (activeTab === 'stock') loadStock();
        if (activeTab === 'messages') loadMessages();
    }, [activeTab]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await onlineSaleService.getAll();
            setOrders(data);
        } catch (e) { toast.error('Error cargando pedidos'); }
        finally { setLoading(false); }
    };

    const loadStock = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getAll();
            setInventory(data);
        } catch (e) { toast.error('Error cargando stock'); }
        finally { setLoading(false); }
    };

    const loadMessages = async () => {
        setLoading(true);
        try {
            const data = await contactService.getAllMessages();
            setMessages(data);
        } catch (e) { toast.error('Error cargando mensajes'); }
        finally { setLoading(false); }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este mensaje?')) return;
        try {
            await contactService.deleteMessage(id);
            toast.success('Mensaje eliminado');
            loadMessages();
        } catch (e) {
            toast.error('Error eliminando mensaje');
        }
    };

    const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
        if (currentStatus) return;
        try {
            await contactService.markAsRead(id);
            loadMessages();
        } catch (e) {
            console.error(e);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: OnlineSale['status']) => {
        if (!window.confirm(`¿Confirmar cambio de estado a: ${newStatus === 'confirmed' ? 'CONFIRMADO' : newStatus}?`)) return;
        try {
            const order = orders.find(o => o.id === id);
            await onlineSaleService.updateStatus(id, newStatus);

            // ENVIAR EMAIL cuando se aprueba un depósito bancario (pending -> confirmed)
            if (newStatus === 'confirmed' && order && order.customerEmail) {
                try {
                    await emailService.sendCompraExitosa({
                        customerName: order.customerName || 'Cliente',
                        customerEmail: order.customerEmail,
                        orderNumber: order.number,
                        securityCode: order.securityCode || '------',
                        totalAmount: order.totalAmount,
                        items: order.items.map(item => ({
                            name: item.productName,
                            quantity: item.quantity,
                            price: item.unitPrice
                        })),
                        deliveryAddress: order.customerAddress || 'Retiro en tienda',
                        estimatedDate: format(addDays(new Date(), 7), 'dd/MM/yyyy')
                    });
                    console.log('✅ Email de aprobación enviado');
                } catch (emailError) {
                    console.error('Error enviando email:', emailError);
                    // No bloqueamos el flujo si falla el email
                }
            }

            await loadOrders(); // Recargar datos
        } catch (e) {
            // Error ya manejado en servicio
        }
    };

    const handleUnconsolidate = async (parentId: string) => {
        if (window.confirm('¿Estás seguro de deshacer la consolidación? Los productos volverán a ser independientes y se eliminarán del padre.')) {
            try {
                await productService.unconsolidate(parentId);
                loadStock();
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleDeleteOrder = async (id: string) => {
        // Verificar que el pedido no esté ya cancelado
        const order = orders.find(o => o.id === id);
        if (!order) {
            toast.error('Pedido no encontrado');
            return;
        }

        if (order.status === 'cancelled') {
            toast.error('Este pedido ya fue cancelado anteriormente');
            return;
        }

        if (!window.confirm('¿Estás seguro de ELIMINAR este pedido? El stock se devolverá al inventario UNA SOLA VEZ.')) return;

        try {
            await onlineSaleService.delete(id);
            await loadOrders(); // Recargar datos
            toast.success('Pedido cancelado correctamente');
        } catch (e) {
            console.error('Error eliminando pedido:', e);
        }
    };

    const handleOpenTrackingModal = (order: OnlineSale) => {
        setSelectedOrder(order);
        setShowTrackingModal(true);
    };

    const handleUpdateTracking = async (
        stage: 'order_received' | 'preparing' | 'airport_departure' | 'airport_arrival' | 'customs' | 'warehouse_ecuador' | 'ready_pickup' | 'delivered',
        description: string
    ) => {
        if (!selectedOrder) return;

        try {
            await onlineSaleService.updateTracking(selectedOrder.id, stage, description);
            setShowTrackingModal(false);
            setSelectedOrder(null);
            await loadOrders();
        } catch (error) {
            // Error ya manejado en el servicio
        }
    };

    const handleEditOrder = (order: OnlineSale) => {
        setEditingOrder(order);
        setEditedItems(JSON.parse(JSON.stringify(order.items))); // Deep clone
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;

        try {
            // Filtrar items con cantidad 0 (eliminados)
            const validItems = editedItems.filter(item => item.quantity > 0);

            // Recalcular total (simple, asumiendo precio fijo unitario guardado)
            // Nota: Esto no recalcula envío, pero el totalAmount se actualiza con la suma de items.
            // Si el envío era aparte, habría que sumarlo. Tomamos el shippingCost original.
            const newItemsSubtotal = validItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            const newTotal = newItemsSubtotal + (editingOrder.shippingCost || 0);

            await onlineSaleService.updateSaleItems(editingOrder.id, validItems, newTotal);

            setEditingOrder(null);
            setEditedItems([]);
            await loadOrders();
        } catch (error) {
            console.error(error);
        }
    };

    const updateItemQuantity = (index: number, change: number) => {
        const newItems = [...editedItems];
        const newQuantity = Math.max(0, newItems[index].quantity + change);
        newItems[index].quantity = newQuantity;
        newItems[index].totalPrice = newItems[index].unitPrice * newQuantity;
        setEditedItems(newItems);
    };

    // Componente RenderMessagesTab
    const RenderMessagesTab = () => (
        <div className="bg-white rounded-lg shadowoverflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensaje</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {messages.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No hay mensajes de contacto
                                </td>
                            </tr>
                        ) : (
                            messages.map((msg) => (
                                <tr key={msg.id} className={msg.read ? 'bg-white' : 'bg-blue-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {msg.createdAt.toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-2 text-gray-400" />
                                            {msg.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center">
                                                <Mail className="h-3 w-3 mr-1" />
                                                {msg.email}
                                            </div>
                                            <div className="flex items-center">
                                                <Phone className="h-3 w-3 mr-1" />
                                                {msg.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 min-w-[300px] whitespace-pre-wrap">
                                        {msg.message}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                            {!msg.read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(msg.id, msg.read)}
                                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                                    title="Marcar como leído"
                                                >
                                                    <CheckCircle className="h-5 w-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Eliminar mensaje"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Protección de ruta: Solo admin autorizado
    if (user && user.email !== 'ueservicesllc1@gmail.com') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
                    <p className="text-gray-600 mb-6">Solo el administrador de la tienda puede acceder aquí.</p>
                    <a href="/dashboard" className="inline-block bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition-colors">
                        Volver al Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ShoppingBag className="h-8 w-8 text-blue-900" />
                        Administración de Tienda
                    </h1>
                    <div className="text-sm text-gray-500">
                        Gestión de Pedidos y Stock Online
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-t-lg shadow-sm border-b border-gray-200 px-6 pt-4 flex space-x-8 mb-6">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Clock className="h-4 w-4" /> Pedidos Online ({orders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'stock' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Package className="h-4 w-4" /> Stock Global
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`pb-4 px-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'messages' ? 'border-blue-900 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <MessageSquare className="h-4 w-4" /> Contacto ({messages ? messages.filter(m => !m.read).length : 0})
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
                    </div>
                ) : (
                    <>
                        {/* Pedidos Activos */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            {activeTab === 'orders' && <OrdersTable
                                orders={orders.filter(o => o.status !== 'cancelled')}
                                onStatusUpdate={handleStatusUpdate}
                                onDeleteOrder={handleDeleteOrder}
                                onOpenTracking={handleOpenTrackingModal}
                                onEditOrder={handleEditOrder} // Nuevo
                                title="Pedidos Activos"
                            />}
                            {activeTab === 'stock' && <StockTable items={inventory} onUnconsolidate={handleUnconsolidate} />}
                            {activeTab === 'messages' && <RenderMessagesTab />}
                        </div>

                        {/* Pedidos Eliminados - Solo mostrar si hay pedidos cancelados */}
                        {activeTab === 'orders' && orders.filter(o => o.status === 'cancelled').length > 0 && (
                            <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
                                <OrdersTable
                                    orders={orders.filter(o => o.status === 'cancelled')}
                                    onStatusUpdate={handleStatusUpdate}
                                    onDeleteOrder={handleDeleteOrder}
                                    onOpenTracking={handleOpenTrackingModal}
                                    // No permitimos editar cancelados
                                    title="Pedidos Eliminados"
                                    isDeletedSection={true}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Modal de Edición */}
                {editingOrder && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Editar Pedido #{editingOrder.number}</h2>
                                <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                {editedItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                                            <p className="text-xs text-gray-500">${item.unitPrice} c/u</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center bg-white border border-gray-300 rounded-md">
                                                <button
                                                    onClick={() => updateItemQuantity(index, -1)}
                                                    className="p-1 hover:bg-gray-100 text-gray-600"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateItemQuantity(index, 1)}
                                                    className="p-1 hover:bg-gray-100 text-gray-600"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="w-20 text-right font-bold text-gray-900">
                                                ${(item.unitPrice * item.quantity).toFixed(2)}
                                            </div>
                                            <button
                                                onClick={() => updateItemQuantity(index, -item.quantity)} // Set to 0
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Eliminar item"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end pt-4 border-t border-gray-100">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Nuevo Total (aprox)</p>
                                        <p className="text-xl font-bold text-blue-900">
                                            ${(editedItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0) + (editingOrder.shippingCost || 0)).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingOrder(null)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" /> Recalcular y Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Subcomponente Tabla Pedidos
const OrdersTable = ({
    orders,
    onStatusUpdate,
    onDeleteOrder,
    onOpenTracking,
    onEditOrder,
    title = "Pedidos",
    isDeletedSection = false
}: {
    orders: OnlineSale[],
    onStatusUpdate: (id: string, status: OnlineSale['status']) => void,
    onDeleteOrder: (id: string) => void,
    onOpenTracking: (order: OnlineSale) => void,
    onEditOrder?: (order: OnlineSale) => void, // Nuevo prop opcional
    title?: string,
    isDeletedSection?: boolean
}) => {
    return (
        <div className="overflow-x-auto">
            {/* Título de la sección */}
            {title && (
                <div className={`px-6 py-4 border-b border-gray-200 ${isDeletedSection ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <h3 className={`text-lg font-semibold ${isDeletedSection ? 'text-red-900' : 'text-gray-900'}`}>
                        {title} ({orders.length})
                    </h3>
                </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Pedido</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recibo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-10 text-center text-gray-500">No hay pedidos registrados</td>
                        </tr>
                    ) : orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-900">#{order.number}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{order.customerName || 'Invitado'}</div>
                                <div className="text-xs text-gray-500">{order.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerPhone || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="font-medium">{order.items.length} productos</div>
                                {order.notes && (order.items.length === 0 || order.notes.includes('Perfumes')) && (
                                    <div className="text-xs text-blue-600 mt-1 max-w-[150px] truncate cursor-help" title={order.notes}>
                                        {order.items.length === 0 ? 'Ver detalles 📝' : '+ Notas'}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">${order.totalAmount.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            order.status === 'processing' ? 'bg-indigo-100 text-indigo-800' :
                                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                    order.status === 'arrived_ecuador' ? 'bg-orange-100 text-orange-800' :
                                                        order.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {order.status === 'pending' ? 'Pendiente Pago' :
                                        order.status === 'confirmed' ? 'Confirmado' :
                                            order.status === 'processing' ? 'Procesando' :
                                                order.status === 'shipped' ? 'En Camino' :
                                                    order.status === 'arrived_ecuador' ? 'Bodega Ecuador' :
                                                        order.status === 'delivered' ? 'Entregado' :
                                                            order.status === 'cancelled' ? 'Cancelado' : order.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                {order.receiptUrl ? (
                                    <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4" /> Ver Recibo
                                    </a>
                                ) : <span className="text-gray-400">Sin recibo</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                    {order.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => onStatusUpdate(order.id, 'confirmed')}
                                                className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                                                title="Confirmar Pago"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                            {/* Botón Editar - Solo para pendientes/confirmados y si no es sección eliminada */}
                                            {onEditOrder && !isDeletedSection && (
                                                <button
                                                    onClick={() => onEditOrder(order)}
                                                    className="p-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                                    title="Editar Items del Pedido"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onStatusUpdate(order.id, 'cancelled')}
                                                className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                                title="Cancelar Pedido"
                                            >
                                                <Ban className="h-5 w-5" />
                                            </button>
                                        </>
                                    )}
                                    {order.status === 'confirmed' && (
                                        <button
                                            onClick={() => onStatusUpdate(order.id, 'processing')}
                                            className="p-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                            title="Marcar como Procesando"
                                        >
                                            <Package className="h-5 w-5" />
                                        </button>
                                    )}
                                    {order.status === 'processing' && (
                                        <button
                                            onClick={() => onStatusUpdate(order.id, 'shipped')}
                                            className="p-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            title="Marcar como En Camino"
                                        >
                                            <Truck className="h-5 w-5" />
                                        </button>
                                    )}
                                    {order.status === 'shipped' && (
                                        <button
                                            onClick={() => onStatusUpdate(order.id, 'arrived_ecuador')}
                                            className="p-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                                            title="Marcar Llegada a Bodega Ecuador"
                                        >
                                            <div className="relative">
                                                <Package className="h-5 w-5" />
                                                <div className="absolute -bottom-1 -right-1 text-[10px]">🇪🇨</div>
                                            </div>
                                        </button>
                                    )}
                                    {order.status === 'arrived_ecuador' && (
                                        <button
                                            onClick={() => onStatusUpdate(order.id, 'delivered')}
                                            className="p-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                                            title="Marcar como Entregado"
                                        >
                                            <CheckCircle className="h-5 w-5" />
                                        </button>
                                    )}
                                    {/* Botón eliminar - deshabilitado si está entregado o cancelado */}
                                    {order.status !== 'cancelled' && (
                                        <button
                                            onClick={() => onDeleteOrder(order.id)}
                                            className={`p-1 rounded ${order.status === 'delivered' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                            title={order.status === 'delivered' ? 'No se puede eliminar pedido entregado' : 'Eliminar pedido y devolver stock (UNA SOLA VEZ)'}
                                            disabled={order.status === 'delivered'}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div >
    );
};

// Subcomponente Tabla Stock
const StockTable = ({ items, onUnconsolidate }: { items: InventoryItem[], onUnconsolidate: (id: string) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showConsolidated, setShowConsolidated] = useState(false);

    const filteredItems = items.filter(item => {
        const matchesSearch = item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = showConsolidated ? (item.product?.isConsolidated === true) : true;
        return matchesSearch && matchesType;
    });

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Filtros */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 w-64 focus-within:ring-2 ring-blue-500">
                    <Search className="h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="border-none outline-none text-sm w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                        <input
                            type="checkbox"
                            checked={showConsolidated}
                            onChange={(e) => setShowConsolidated(e.target.checked)}
                            className="rounded text-blue-900 focus:ring-blue-900 h-4 w-4 border-gray-300"
                        />
                        Ver solo Consolidados
                    </label>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hijos</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No se encontraron productos</td>
                            </tr>
                        ) : filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                                    {item.product?.isConsolidated && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                            Consolidado
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{item.product?.sku}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.product?.consolidatedProducts?.length || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.location?.toLowerCase().includes('ecuador') ? 'bg-yellow-100 text-yellow-800' :
                                        item.location?.toLowerCase().includes('usa') ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                        {item.location || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`font-bold ${item.quantity < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {item.quantity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {item.product?.isConsolidated && (
                                        <button
                                            onClick={() => onUnconsolidate(item.product!.id)}
                                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                        >
                                            Deshacer
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminStore;
