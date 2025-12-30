import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Calendar, CreditCard, Truck, MapPin, Menu, Search, ChevronDown, ChevronUp, User, LogOut, LayoutDashboard, ShoppingCart, Wallet, Eye, Truck as TruckIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { onlineSaleService } from '../services/onlineSaleService';
import { sellerService } from '../services/sellerService';
import { productService } from '../services/productService';
import { getImageUrl } from '../utils/imageUtils';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import Footer from '../components/Layout/Footer';

interface OrderItem {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
}

interface Order {
    id: string;
    number: string;
    items: OrderItem[];
    totalAmount: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    status: string;
    paymentMethod: string;
    receiptUrl?: string;
    notes?: string;
    createdAt: Date;
    estimatedDelivery?: Date;
}

const CustomerOrders: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading, isAdmin } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

    const toggleOrderExpansion = (orderId: string) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    // Verificar si el usuario es vendedor real
    useEffect(() => {
        const checkSellerStatus = async () => {
            if (user && user.email) {
                if (isAdmin) {
                    setIsVerifiedSeller(true);
                    return;
                }
                try {
                    const sellers = await sellerService.getAll();
                    const sellerExists = sellers.some(seller => seller.email === user.email);
                    setIsVerifiedSeller(sellerExists);
                } catch (error) {
                    console.error('Error verificando vendedor:', error);
                    setIsVerifiedSeller(false);
                }
            } else {
                setIsVerifiedSeller(false);
            }
        };
        checkSellerStatus();
    }, [user, isAdmin]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success('Sesión cerrada correctamente');
            setShowUserMenu(false);
            navigate('/');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            toast.error('Error al cerrar sesión');
        }
    };

    const loadOrders = useCallback(async () => {
        if (!user?.email) {
            console.log('❌ No hay usuario o email');
            return;
        }

        try {
            setLoadingOrders(true);
            console.log('🔍 Cargando pedidos para:', user.email);
            const allSales = await onlineSaleService.getAll();
            console.log('📦 Total de ventas en sistema:', allSales.length);

            // Filtrar ventas del usuario actual
            const userOrders = allSales
                .filter(sale => {
                    const matches = sale.customerEmail === user.email;
                    if (!matches) {
                        console.log('❌ Venta no coincide:', {
                            saleEmail: sale.customerEmail,
                            userEmail: user.email,
                            saleNumber: sale.number,
                            status: sale.status
                        });
                    }
                    return matches;
                })
                .map(sale => ({
                    ...sale,
                    estimatedDelivery: addDays(sale.createdAt, Math.floor(Math.random() * 4) + 12) // 12-15 días
                }))
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            console.log('✅ Pedidos del usuario:', userOrders.length);
            userOrders.forEach(order => {
                console.log(`   - ${order.number} (${order.status}) - ${order.customerEmail}`);
            });

            // Enriquecer con imágenes de productos si no las tienen
            for (const order of userOrders) {
                for (const item of order.items) {
                    if (!item.imageUrl && item.productId) {
                        try {
                            const product = await productService.getById(item.productId);
                            if (product?.imageUrl) {
                                item.imageUrl = product.imageUrl;
                            }
                        } catch (error) {
                            console.warn(`No se pudo cargar imagen para producto ${item.productId}:`, error);
                        }
                    }
                }
            }

            setOrders(userOrders as any);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoadingOrders(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) return; // Esperar a que termine de cargar auth

        if (!user) {
            navigate('/login');
            return;
        }
        loadOrders();
    }, [user, navigate, loadOrders, authLoading]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'Confirmado';
            case 'pending':
                return 'Pendiente';
            case 'cancelled':
                return 'Cancelado';
            default:
                return status;
        }
    };

    const getPaymentMethodText = (method: string) => {
        switch (method) {
            case 'banco_pichincha':
                return 'Banco Pichincha';
            case 'paypal':
                return 'PayPal';
            default:
                return method;
        }
    };

    if (authLoading || loadingOrders) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Estilo Envíos Ecuador */}
            <header className="sticky top-0 z-40">
                {/* Barra Principal Azul Corporativo */}
                <div className="bg-blue-900 shadow-md">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                            {/* Logo */}
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex flex-col cursor-pointer"
                                    onClick={() => navigate('/')}
                                >
                                    <div className="flex items-center gap-2">
                                        <img src="/logo-compras-express.png" alt="Compras Express" className="h-10 object-contain bg-white rounded px-2 py-1" />
                                    </div>
                                    <span className="text-[10px] text-yellow-400 leading-none tracking-wide mt-1">Compra en USA y recíbelo en Ecuador</span>
                                </div>
                            </div>

                            {/* Título de página */}
                            <div className="flex-1 text-center hidden md:block">
                                <h1 className="text-xl font-bold text-white">Mis Pedidos</h1>
                            </div>

                            {/* Menú Derecho (Usuario) */}
                            <div className="flex items-center gap-6 text-white text-sm font-medium">
                                {user ? (
                                    <div className="relative group cursor-pointer flex items-center gap-1">
                                        <div className="flex flex-col items-end leading-tight">
                                            <span className="text-[11px] font-normal opacity-90">Hola, {user.displayName?.split(' ')[0] || 'Usuario'}</span>
                                            <span className="flex items-center gap-1 font-bold">Mi cuenta <ChevronDown className="h-3 w-3" /></span>
                                        </div>

                                        {/* Dropdown Usuario */}
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded shadow-xl py-2 text-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                            <div className="absolute -top-1 right-4 w-3 h-3 bg-white transform rotate-45 border-t border-l border-gray-100"></div>
                                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                                <p className="text-xs text-gray-500">Conectado como</p>
                                                <p className="font-bold truncate">{user.email}</p>
                                            </div>
                                            <button onClick={() => navigate('/my-orders')} className="w-full text-left px-4 py-2 hover:bg-gray-50 hover:text-blue-900 flex items-center gap-2">
                                                <Package className="h-4 w-4" /> Mis pedidos
                                            </button>
                                            <button onClick={() => navigate('/')} className="w-full text-left px-4 py-2 hover:bg-gray-50 hover:text-blue-900 flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4" /> Ir a la tienda
                                            </button>
                                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center gap-2">
                                                <LogOut className="h-4 w-4" /> Cerrar sesión
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => navigate('/login')} className="flex items-center gap-2 hover:underline">
                                        <User className="h-5 w-5" /> Regístrate o Inicia sesión
                                    </button>
                                )}

                                {/* Botón Dashboard Vendedor */}
                                {(isVerifiedSeller || isAdmin) && (
                                    <button
                                        className="flex items-center gap-1 relative group hover:text-yellow-400 transition-colors"
                                        onClick={() => navigate('/dashboard')}
                                        title="Panel de Vendedor"
                                    >
                                        <LayoutDashboard className="h-6 w-6" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-Header */}
                <div className="bg-blue-800 text-white text-xs border-t border-white/10 hidden md:block">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center gap-8 py-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-1 font-medium hover:text-yellow-300 whitespace-nowrap"
                            >
                                ← Volver a la tienda
                            </button>
                            <span className="text-gray-300">|</span>
                            <span className="text-yellow-400 font-medium">{orders.length} pedido(s) encontrado(s)</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* User Profile Card */}
                {user && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 p-6 flex items-center space-x-6">
                        <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{user.displayName || 'Usuario'}</h2>
                            <p className="text-gray-500">{user.email}</p>
                            <div className="mt-2 flex space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                    <Package className="h-4 w-4 mr-1" />
                                    {orders.length} pedidos
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <Package className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No tienes pedidos aún</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Explora nuestra tienda y realiza tu primera compra
                        </p>
                        {/* Debug info */}
                        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-xs">
                            <p className="font-bold mb-2">🔍 Información de depuración:</p>
                            <p><strong>Usuario:</strong> {user?.displayName || 'N/A'}</p>
                            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
                            <p className="mt-2 text-gray-600">Revisa la consola del navegador (F12) para más detalles</p>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Ir a la tienda
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        {/* Encabezados de tabla */}
                        <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
                            <div className="grid grid-cols-12 gap-4 items-center font-semibold text-xs text-gray-600 uppercase tracking-wide">
                                <div className="col-span-3">Pedido</div>
                                <div className="col-span-3">Fecha</div>
                                <div className="col-span-2">Total</div>
                                <div className="col-span-2">Estado</div>
                                <div className="col-span-2 text-center">Acciones</div>
                            </div>
                        </div>

                        {/* Lista de pedidos */}
                        <div className="divide-y divide-gray-200">
                            {orders.map((order) => (
                                <div key={order.id}>
                                    {/* Fila del pedido */}
                                    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-3">
                                                <p className="text-sm font-medium text-gray-900">{order.number}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                                                </p>
                                            </div>
                                            <div className="col-span-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <p className="text-sm text-gray-900">
                                                        {format(order.createdAt, "dd/MM/yyyy", { locale: es })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-sm font-bold text-blue-600">${order.totalAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                    {getStatusText(order.status)}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/track-order/${order.id}`)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-900 rounded-lg hover:bg-green-100 transition-colors font-medium text-xs"
                                                        title="Rastrear pedido"
                                                    >
                                                        <TruckIcon className="h-3.5 w-3.5" />
                                                        Rastreo
                                                    </button>
                                                    <button
                                                        onClick={() => toggleOrderExpansion(order.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-lg hover:bg-blue-100 transition-colors font-medium text-xs"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        {expandedOrders.has(order.id) ? 'Ocultar' : 'Ver'}
                                                        {expandedOrders.has(order.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalles expandidos */}
                                    {expandedOrders.has(order.id) && (
                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                            <div className="space-y-4">
                                                {order.items.map((item, index) => (
                                                    <div key={index} className="flex gap-4 bg-white p-4 rounded-lg">
                                                        {/* Product Image */}
                                                        <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                                                            {item.imageUrl ? (
                                                                <img
                                                                    src={getImageUrl(item.imageUrl)}
                                                                    alt={item.productName}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package className="h-6 w-6 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Product Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                                {item.productName}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 mb-2">SKU: {item.productSku}</p>
                                                            <div className="flex items-center space-x-3 text-xs text-gray-600">
                                                                <span>Cantidad: {item.quantity}</span>
                                                                <span>•</span>
                                                                <span className="font-medium">${item.unitPrice.toLocaleString()} c/u</span>
                                                                <span>•</span>
                                                                <span className="font-bold text-gray-900">${item.totalPrice.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Order Details */}
                                            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="flex items-start gap-2">
                                                    <CreditCard className="h-4 w-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Método de pago</p>
                                                        <p className="text-sm font-medium text-gray-900">{getPaymentMethodText(order.paymentMethod)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Truck className="h-4 w-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Entrega estimada</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {order.estimatedDelivery
                                                                ? format(order.estimatedDelivery, "dd/MM/yyyy", { locale: es })
                                                                : '12-15 días'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Dirección de envío</p>
                                                        <p className="text-sm font-medium text-gray-900">{order.customerAddress}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {order.notes && (
                                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                                    <p className="text-xs text-blue-800 font-medium mb-1">Notas del pedido</p>
                                                    <p className="text-xs text-blue-700 whitespace-pre-line">{order.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default CustomerOrders;
