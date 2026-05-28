import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Settings, Truck, Package, ShoppingBag, DollarSign, Users,
    Database, Save, RefreshCw, Plus, X, LogOut, Home,
    ChevronRight, Search, Eye, Check, Ban, Trash2, BarChart3, ArrowDown, ArrowUp, Edit2, Lock
} from 'lucide-react';
import { shippingSettingsService, CityShipping } from '../services/shippingSettingsService';
import { vibeOrderService, VibeOrder } from '../services/vibeOrderService';
import { vibePaymentService, VibePayment } from '../services/vibePaymentService';
import { userService } from '../services/userPreferencesService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useVibeConfig } from '../contexts/VibeConfigContext';
import { vibeConfigService } from '../services/vibeConfigService';

type Tab = 'home' | 'summary' | 'orders' | 'payments' | 'users' | 'products' | 'warehouse' | 'shipping';

export default function AdminConfig() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('home');

    // Shipping
    const [cities, setCities] = useState<CityShipping[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [saving, setSaving] = useState(false);

    // Vibe Orders
    const [orders, setOrders] = useState<VibeOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState('all');

    // Vibe Payments
    const [payments, setPayments] = useState<VibePayment[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchUsers, setSearchUsers] = useState('');

    const [products, setProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchProducts, setSearchProducts] = useState('');
    const [editingPvp, setEditingPvp] = useState<Record<string, boolean>>({});
    const [pvpValues, setPvpValues] = useState<Record<string, string>>({});
    
    // Global Vibe Config
    const { config: vibeConfig } = useVibeConfig();
    const [discountInput, setDiscountInput] = useState('');
    const [savingDiscount, setSavingDiscount] = useState(false);

    useEffect(() => {
        if (vibeConfig) {
            setDiscountInput(vibeConfig.fakeDiscountPercentage?.toString() || '0');
        }
    }, [vibeConfig]);
    
    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pinProductTarget, setPinProductTarget] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');

    // Warehouse
    const [inventory, setInventory] = useState<any[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [warehouseSort, setWarehouseSort] = useState<'qty-asc' | 'qty-desc' | 'val-asc' | 'val-desc' | 'none'>('none');

    useEffect(() => {
        if (!authLoading) {
            if (!user) navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (!user) return;
        if (activeTab === 'home' || activeTab === 'shipping') loadCities();
        if (activeTab === 'orders') loadOrders();
        if (activeTab === 'payments') loadPayments();
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'products') loadProducts();
        if (activeTab === 'warehouse') loadInventory();
    }, [activeTab, user]);

    const loadCities = async () => {
        try {
            setLoadingCities(true);
            const data = await shippingSettingsService.getShippingCosts();
            setCities(data);
        } catch (e) { console.error(e); } finally { setLoadingCities(false); }
    };

    const loadOrders = async () => {
        try {
            setLoadingOrders(true);
            const data = await vibeOrderService.getAll();
            setOrders(data);
        } catch (e) { console.error(e); } finally { setLoadingOrders(false); }
    };

    const loadPayments = async () => {
        try {
            setLoadingPayments(true);
            const data = await vibePaymentService.getAll();
            setPayments(data);
        } catch (e) { console.error(e); } finally { setLoadingPayments(false); }
    };

    const handleUpdateOrderStatus = async (id: string, status: VibeOrder['status']) => {
        try {
            await vibeOrderService.updateStatus(id, status);
            toast.success('Estado actualizado');
            loadOrders();
        } catch (e) { toast.error('Error al actualizar'); }
    };

    const handleConfirmPayment = async (id: string) => {
        try {
            await vibePaymentService.confirm(id, user!.email!);
            toast.success('Pago confirmado');
            loadPayments();
        } catch (e) { toast.error('Error al confirmar pago'); }
    };

    const handleRejectPayment = async (id: string) => {
        try {
            await vibePaymentService.reject(id);
            toast.success('Pago rechazado');
            loadPayments();
        } catch (e) { toast.error('Error al rechazar'); }
    };

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (e) { console.error(e); } finally { setLoadingUsers(false); }
    };

    const loadProducts = async () => {
        try {
            setLoadingProducts(true);
            const data = await productService.getAll();
            setProducts(data);
        } catch (e) { console.error(e); } finally { setLoadingProducts(false); }
    };

    const handleSavePvp = async (productId: string) => {
        const val = parseFloat(pvpValues[productId]);
        if (isNaN(val)) return toast.error('Valor inválido');
        try {
            await productService.update(productId, { pvp: val });
            toast.success('PVP guardado');
            setEditingPvp(prev => ({ ...prev, [productId]: false }));
            loadProducts();
        } catch (e) {
            toast.error('Error al guardar PVP');
        }
    };

    const handleSaveDiscount = async () => {
        const val = parseFloat(discountInput);
        if (isNaN(val) || val < 0) return toast.error('Porcentaje inválido');
        try {
            setSavingDiscount(true);
            await vibeConfigService.setConfig({ fakeDiscountPercentage: val });
            toast.success('Descuento global guardado exitosamente');
        } catch (e) {
            toast.error('Error al guardar descuento');
        } finally {
            setSavingDiscount(false);
        }
    };

    const handleEditPvpClick = (productId: string) => {
        setPinProductTarget(productId);
        setPinInput('');
        setPinModalOpen(true);
    };

    const handlePinSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (pinInput === '1619') {
            if (pinProductTarget) {
                setEditingPvp(prev => ({ ...prev, [pinProductTarget]: true }));
                setPvpValues(prev => ({ ...prev, [pinProductTarget]: products.find(p => p.id === pinProductTarget)?.pvp?.toString() || '' }));
            }
            setPinModalOpen(false);
        } else {
            toast.error('PIN incorrecto');
            setPinInput('');
        }
    };

    const loadInventory = async () => {
        try {
            setLoadingInventory(true);
            const data = await inventoryService.getAll();
            setInventory(data);
        } catch (e) { console.error(e); } finally { setLoadingInventory(false); }
    };

    const handleLoadDefaultCities = async () => {
        if (!window.confirm('Reemplazar con ciudades por defecto de Ecuador?')) return;
        try {
            setLoadingCities(true);
            const data = await shippingSettingsService.loadDefaultEcuadorCities();
            setCities(data);
        } catch (e) { console.error(e); } finally { setLoadingCities(false); }
    };

    const handleCityChange = (index: number, field: keyof CityShipping, value: any) => {
        const newCities = [...cities];
        newCities[index] = { ...newCities[index], [field]: value };
        setCities(newCities);
    };

    const handleSaveCities = async () => {
        try {
            setSaving(true);
            const valid = cities.filter(c => c.city.trim() !== '');
            await shippingSettingsService.saveShippingCosts(valid);
            setCities(valid);
            toast.success('Costos de envío guardados');
        } catch (e) { console.error(e); toast.error('Error al guardar'); } finally { setSaving(false); }
    };

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'home' as Tab, label: 'Inicio', icon: Home },
        { id: 'summary' as Tab, label: 'Resumen', icon: BarChart3 },
        { id: 'orders' as Tab, label: 'Pedidos', icon: ShoppingBag },
        { id: 'payments' as Tab, label: 'Pagos', icon: DollarSign },
        { id: 'users' as Tab, label: 'Usuarios', icon: Users },
        { id: 'products' as Tab, label: 'Productos', icon: Package },
        { id: 'warehouse' as Tab, label: 'Bodega', icon: Database },
        { id: 'shipping' as Tab, label: 'Envíos', icon: Truck },
    ];

    const filteredUsers = users.filter(u =>
        !searchUsers ||
        (u.email || '').toLowerCase().includes(searchUsers.toLowerCase()) ||
        (u.displayName || '').toLowerCase().includes(searchUsers.toLowerCase())
    );

    const filteredProducts = products.filter(p =>
        !searchProducts ||
        (p.name || '').toLowerCase().includes(searchProducts.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchProducts.toLowerCase())
    );

    const filteredAndSortedWarehouse = inventory
        .filter(i => (i.location || '').toLowerCase().includes('ecuador'))
        .sort((a, b) => {
            const qtyA = a.quantity ?? 0;
            const qtyB = b.quantity ?? 0;
            const valA = qtyA * (a.cost ?? 0);
            const valB = qtyB * (b.cost ?? 0);
            
            if (warehouseSort === 'qty-asc') return qtyA - qtyB;
            if (warehouseSort === 'qty-desc') return qtyB - qtyA;
            if (warehouseSort === 'val-asc') return valA - valB;
            if (warehouseSort === 'val-desc') return valB - valA;
            return 0;
        });

    const totalInventoryValue = filteredAndSortedWarehouse.reduce((sum, item) => sum + ((item.quantity ?? 0) * (item.cost ?? 0)), 0);
    const totalInventoryProducts = filteredAndSortedWarehouse.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const totalSales = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    const totalOrdersCount = orders.filter(o => o.status !== 'cancelled').length;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Top Bar */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-white/10" style={{ background: '#1e293b' }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="text-white font-bold text-sm">Super Admin</span>
                        <span className="text-gray-400 text-xs ml-2">· {user.email}</span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <nav className="w-52 flex-shrink-0 border-r border-white/10 py-4 flex flex-col gap-1 px-3" style={{ background: '#1e293b' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <tab.icon className="w-4 h-4 flex-shrink-0" />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6" style={{ background: '#0f172a' }}>

                    {/* SUMMARY */}
                    {activeTab === 'summary' && (
                        <div>
                            <h2 className="text-white text-2xl font-bold mb-6 flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-blue-400" />
                                Resumen General
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                            <Package className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h3 className="text-gray-400 font-medium">Productos en Inventario</h3>
                                    </div>
                                    <p className="text-white text-3xl font-bold">{totalInventoryProducts} <span className="text-sm font-normal text-gray-500">unidades</span></p>
                                </div>
                                
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                            <DollarSign className="w-5 h-5 text-green-400" />
                                        </div>
                                        <h3 className="text-gray-400 font-medium">Valor Real del Inventario</h3>
                                    </div>
                                    <p className="text-white text-3xl font-bold">${totalInventoryValue.toFixed(2)}</p>
                                    <p className="text-gray-500 text-xs mt-1">Costo total de la bodega Ecuador</p>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <ShoppingBag className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <h3 className="text-gray-400 font-medium">Reporte de Ventas</h3>
                                    </div>
                                    <p className="text-white text-3xl font-bold">${totalSales.toFixed(2)}</p>
                                    <p className="text-gray-500 text-xs mt-1">Generado en {totalOrdersCount} pedidos confirmados</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HOME */}
                    {activeTab === 'home' && (
                        <div>
                            <h2 className="text-white text-2xl font-bold mb-1">Panel de Control</h2>
                            <p className="text-gray-400 text-sm mb-8">Accede rápidamente a cada sección.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {tabs.filter(t => t.id !== 'home').map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 text-left transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center mb-3 group-hover:bg-blue-600/40 transition-colors">
                                            <tab.icon className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h3 className="text-white font-semibold text-sm">{tab.label}</h3>
                                        <ChevronRight className="w-4 h-4 text-gray-500 mt-1 group-hover:text-blue-400 transition-colors" />
                                    </button>
                                ))}
                            </div>

                            {/* Quick shipping summary */}
                            <div className="mt-8 bg-white/5 rounded-xl border border-white/10 p-5">
                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-blue-400" />
                                    Costos de envío activos
                                </h3>
                                {loadingCities ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {cities.filter(c => c.active).map((c, i) => (
                                            <span key={i} className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-xs">
                                                {c.city} — ${c.cost}
                                            </span>
                                        ))}
                                        {cities.filter(c => c.active).length === 0 && (
                                            <span className="text-gray-500 text-sm">Sin ciudades configuradas</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ORDERS */}
                    {activeTab === 'orders' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-white text-xl font-bold">Pedidos — Tienda Vibe</h2>
                                <button onClick={loadOrders} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                                    <RefreshCw className="w-4 h-4" /> Recargar
                                </button>
                            </div>
                            {/* Filters */}
                            <div className="flex gap-2 mb-4 flex-wrap">
                                {['all','pending','confirmed','processing','shipped','arrived_ecuador','delivered','cancelled'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setOrderStatusFilter(s)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            orderStatusFilter === s
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendiente' : s === 'confirmed' ? 'Confirmado' : s === 'processing' ? 'Procesando' : s === 'shipped' ? 'En Camino' : s === 'arrived_ecuador' ? 'Bodega EC' : s === 'delivered' ? 'Entregado' : 'Cancelado'}
                                    </button>
                                ))}
                            </div>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente, email o #pedido..."
                                    value={orderSearch}
                                    onChange={e => setOrderSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            {loadingOrders ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>
                            ) : (
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">#</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Cliente</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Items</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Total</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Pago</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Recibo</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders
                                                .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                                                .filter(o => !orderSearch ||
                                                    (o.userName || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                                                    (o.userEmail || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                                                    (o.number || '').includes(orderSearch)
                                                )
                                                .length === 0 ? (
                                                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-500">No hay pedidos</td></tr>
                                            ) : orders
                                                .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                                                .filter(o => !orderSearch ||
                                                    (o.userName || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                                                    (o.userEmail || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
                                                    (o.number || '').includes(orderSearch)
                                                )
                                                .map(order => (
                                                <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3 text-blue-400 font-bold">#{order.number || '—'}</td>
                                                    <td className="px-4 py-3 text-white">{order.userName || 'Invitado'}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">{order.userEmail || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-300">{order.items?.length ?? 0} items</td>
                                                    <td className="px-4 py-3 text-green-400 font-semibold">${(order.totalAmount ?? 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs capitalize">{order.paymentStatus || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            order.status === 'confirmed' || order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                                            order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                            {order.status === 'pending' ? 'Pendiente' : order.status === 'confirmed' ? 'Confirmado' : order.status === 'processing' ? 'Procesando' : order.status === 'shipped' ? 'En camino' : order.status === 'delivered' ? 'Entregado' : order.status === 'cancelled' ? 'Cancelado' : order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-gray-600 text-xs">—</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {order.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleUpdateOrderStatus(order.id!, 'confirmed')}
                                                                className="px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded text-xs font-medium"
                                                            >
                                                                Confirmar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PAYMENTS */}
                    {activeTab === 'payments' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-white text-xl font-bold">Pagos — Tienda Vibe</h2>
                                    <p className="text-gray-500 text-xs mt-1">Colección: <span className="font-mono text-blue-400">vibePayments</span></p>
                                </div>
                                <button onClick={loadPayments} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
                                    <RefreshCw className="w-4 h-4" /> Recargar
                                </button>
                            </div>
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                    <p className="text-green-400 text-xs font-medium mb-1">Confirmados</p>
                                    <p className="text-white text-2xl font-bold">{payments.filter(p => p.status === 'confirmed').length}</p>
                                    <p className="text-green-400 text-xs mt-1">${payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount ?? 0), 0).toFixed(2)}</p>
                                </div>
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                                    <p className="text-yellow-400 text-xs font-medium mb-1">Pendientes</p>
                                    <p className="text-white text-2xl font-bold">{payments.filter(p => p.status === 'pending').length}</p>
                                    <p className="text-yellow-400 text-xs mt-1">${payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount ?? 0), 0).toFixed(2)}</p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                    <p className="text-blue-400 text-xs font-medium mb-1">Total recaudado</p>
                                    <p className="text-white text-2xl font-bold">${payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount ?? 0), 0).toFixed(2)}</p>
                                    <p className="text-blue-400 text-xs mt-1">{payments.length} registros</p>
                                </div>
                            </div>
                            {loadingPayments ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>
                            ) : payments.length === 0 ? (
                                <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
                                    <DollarSign className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400 font-medium">Sin pagos aún</p>
                                    <p className="text-gray-600 text-sm mt-1">Los pagos de la nueva app Vibe aparecerán aquí</p>
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">#Pago</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Cliente</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Método</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Monto</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Fecha</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Estado</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Comprobante</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map(p => (
                                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3 text-blue-400 font-bold">{p.number || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-white text-xs">{p.userName || 'Invitado'}</div>
                                                        <div className="text-gray-500 text-xs">{p.userEmail}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-300 text-xs capitalize">
                                                        {p.paymentMethod === 'banco_pichincha' ? 'Banco Pichincha' :
                                                         p.paymentMethod === 'banco_guayaquil' ? 'Banco Guayaquil' :
                                                         p.paymentMethod || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-green-400 font-bold">${(p.amount ?? 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">{p.createdAt ? new Date((p.createdAt as any)?.seconds ? (p.createdAt as any).seconds * 1000 : p.createdAt).toLocaleDateString('es-EC') : '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            p.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                            p.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                            {p.status === 'confirmed' ? 'Confirmado' : p.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {p.receiptUrl ? (
                                                            <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline">Ver comprobante</a>
                                                        ) : <span className="text-gray-600 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {p.status === 'pending' && (
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleConfirmPayment(p.id!)} className="px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded text-xs">✓</button>
                                                                <button onClick={() => handleRejectPayment(p.id!)} className="px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded text-xs">✗</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* USERS */}
                    {activeTab === 'users' && (
                        <div>
                            <h2 className="text-white text-xl font-bold mb-2">Usuarios Registrados</h2>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o email..."
                                    value={searchUsers}
                                    onChange={e => setSearchUsers(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            {loadingUsers ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>
                            ) : (
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Usuario</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Rol</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.length === 0 ? (
                                                <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-500">No hay usuarios</td></tr>
                                            ) : filteredUsers.map(u => (
                                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3 text-white">{u.displayName || 'Sin nombre'}</td>
                                                    <td className="px-4 py-3 text-gray-400">{u.email || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                                            u.role === 'advisor' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                            {u.role || 'cliente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PRODUCTS */}
                    {activeTab === 'products' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-white text-xl font-bold">Catálogo de Productos</h2>
                                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                    <span className="text-sm text-gray-400 font-medium">% Descuento Global (Simulado):</span>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={discountInput}
                                                onChange={e => setDiscountInput(e.target.value)}
                                                className="w-20 bg-black/50 border border-white/20 rounded-lg py-1.5 pl-3 pr-6 text-white text-sm focus:outline-none focus:border-blue-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                        </div>
                                        <button
                                            onClick={handleSaveDiscount}
                                            disabled={savingDiscount}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto o SKU..."
                                    value={searchProducts}
                                    onChange={e => setSearchProducts(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            {loadingProducts ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>
                            ) : (
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Producto</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">SKU</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Costo</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Precio 1</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">PVP (Vibe)</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Precio Desc</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.length === 0 ? (
                                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No hay productos</td></tr>
                                            ) : filteredProducts.map(p => (
                                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                                                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.sku || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-400">${(p.cost ?? 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-green-400">${(p.salePrice1 ?? 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3">
                                                        {(p.pvp !== undefined && p.pvp !== null) && !editingPvp[p.id] ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-blue-400 font-bold">${p.pvp.toFixed(2)}</span>
                                                                <button onClick={() => handleEditPvpClick(p.id)} className="text-gray-500 hover:text-white" title="Editar PVP">
                                                                    <Edit2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        className="w-20 pl-5 pr-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                                                                        value={pvpValues[p.id] !== undefined ? pvpValues[p.id] : (p.pvp || '')}
                                                                        onChange={(e) => setPvpValues(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleSavePvp(p.id)}
                                                                    className="p-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded"
                                                                    title="Guardar PVP"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-red-400 line-through text-xs">
                                                        ${(p.pvp ? p.pvp * (1 + (vibeConfig?.fakeDiscountPercentage || 0) / 100) : (p.salePrice1 || 0) * (1 + (vibeConfig?.fakeDiscountPercentage || 0) / 100)).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* WAREHOUSE */}
                    {activeTab === 'warehouse' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-white text-xl font-bold">Bodega Ecuador — Inventario</h2>
                                
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">Ordenar por:</span>
                                    <select 
                                        value={warehouseSort}
                                        onChange={(e) => setWarehouseSort(e.target.value as any)}
                                        className="bg-[#1e293b] border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="none" className="bg-[#1e293b] text-white">Por defecto</option>
                                        <option value="qty-desc" className="bg-[#1e293b] text-white">Cantidad (Mayor a menor)</option>
                                        <option value="qty-asc" className="bg-[#1e293b] text-white">Cantidad (Menor a mayor)</option>
                                        <option value="val-desc" className="bg-[#1e293b] text-white">Valor (Mayor a menor)</option>
                                        <option value="val-asc" className="bg-[#1e293b] text-white">Valor (Menor a mayor)</option>
                                    </select>
                                </div>
                            </div>
                            
                            {loadingInventory ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>
                            ) : (
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Producto</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Ubicación</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Cantidad</th>
                                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAndSortedWarehouse.length === 0 ? (
                                                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">No hay items en Bodega Ecuador</td></tr>
                                            ) : filteredAndSortedWarehouse.map((item, idx) => (
                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3 text-white">{item.productName || item.product?.name || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">{item.location}</td>
                                                    <td className="px-4 py-3 text-blue-400 font-semibold">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-green-400">${((item.quantity ?? 0) * (item.cost ?? 0)).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SHIPPING CONFIG */}
                    {activeTab === 'shipping' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-white text-xl font-bold">Costos de Envío por Ciudad</h2>
                                <button
                                    onClick={handleLoadDefaultCities}
                                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Cargar Ecuador
                                </button>
                            </div>
                            {loadingCities ? (
                                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div></div>
                            ) : (
                                <div className="space-y-2 max-w-xl">
                                    {cities.map((city, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={city.active}
                                                onChange={e => handleCityChange(index, 'active', e.target.checked)}
                                                className="rounded"
                                            />
                                            <input
                                                type="text"
                                                value={city.city}
                                                onChange={e => handleCityChange(index, 'city', e.target.value)}
                                                placeholder="Ciudad"
                                                className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                                            />
                                            <div className="flex items-center gap-1 bg-white/5 rounded px-2 py-1">
                                                <span className="text-gray-400 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={city.cost}
                                                    onChange={e => handleCityChange(index, 'cost', Number(e.target.value))}
                                                    className="w-14 bg-transparent text-white text-sm text-right focus:outline-none"
                                                    min="0"
                                                    step="0.5"
                                                />
                                            </div>
                                            <button onClick={() => { const c = [...cities]; c.splice(index, 1); setCities(c); }} className="text-red-500 hover:text-red-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {cities.length === 0 && (
                                        <p className="text-gray-500 text-sm py-6 text-center">No hay ciudades. Carga las ciudades de Ecuador o añade una manualmente.</p>
                                    )}
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => setCities([...cities, { city: '', cost: 0, active: true }])}
                                            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors border border-white/10"
                                        >
                                            <Plus className="w-4 h-4" /> Añadir ciudad
                                        </button>
                                        <button
                                            onClick={handleSaveCities}
                                            disabled={saving}
                                            className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* PIN MODAL */}
            {pinModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="text-white text-lg font-bold">Autorización Requerida</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-6">Ingresa el PIN de seguridad para modificar el Precio de Venta al Público (PVP).</p>
                        <form onSubmit={handlePinSubmit}>
                            <input
                                type="password"
                                autoFocus
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                placeholder="••••"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest focus:outline-none focus:border-blue-500 mb-6"
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPinModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium text-sm"
                                >
                                    Verificar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
