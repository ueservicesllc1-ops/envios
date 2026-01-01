import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Plane, FileCheck, Warehouse, CheckCircle, Clock, ArrowLeft, XCircle, Menu, Search, ChevronDown, User, LogOut, LayoutDashboard, ShoppingCart, Wallet } from 'lucide-react';
import { onlineSaleService, OnlineSale } from '../services/onlineSaleService';
import { sellerService } from '../services/sellerService';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

const OrderTracking: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [order, setOrder] = useState<OnlineSale | null>(null);
    const [loading, setLoading] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        loadOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    useEffect(() => {
        if (user?.email === 'ueservicesllc1@gmail.com') {
            setIsAdmin(true);
        }
    }, [user]);

    const loadOrder = async () => {
        if (!orderId) return;
        try {
            const orders = await onlineSaleService.getAll();
            const foundOrder = orders.find(o => o.id === orderId);
            setOrder(foundOrder || null);
        } catch (error) {
            console.error('Error loading order:', error);
        } finally {
            setLoading(false);
        }
    };

    const trackingStages = [
        {
            id: 'order_received',
            label: 'Orden Recibida',
            icon: CheckCircle,
            description: 'Pedido confirmado'
        },
        {
            id: 'preparing',
            label: 'Preparando',
            icon: Package,
            description: 'Empacando'
        },
        {
            id: 'airport_departure',
            label: 'Aeropuerto Salida',
            icon: Plane,
            description: 'En origen'
        },
        {
            id: 'airport_arrival',
            label: 'Aeropuerto Destino',
            icon: Plane,
            description: 'En Ecuador'
        },
        {
            id: 'customs',
            label: 'Aduana',
            icon: FileCheck,
            description: 'Revisión'
        },
        {
            id: 'warehouse_ecuador',
            label: 'Bodega Ecuador',
            icon: Warehouse,
            description: 'Almacenado'
        },
        {
            id: 'ready_pickup',
            label: 'Listo',
            icon: CheckCircle,
            description: 'Para retirar'
        }
    ];

    const getCurrentStageIndex = () => {
        if (!order || !order.trackingStage) return 0;
        return trackingStages.findIndex(s => s.id === order.trackingStage);
    };

    const currentStageIndex = getCurrentStageIndex();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success('Sesión cerrada');
            navigate('/');
        } catch (error) {
            toast.error('Error al cerrar sesión');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Pedido no encontrado</h2>
                    <button
                        onClick={() => navigate('/my-orders')}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        Volver a mis pedidos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Principal */}
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-[1200px] mx-auto px-4">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-2 shadow-md">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Envíos Ecuador</h1>
                                <p className="text-xs text-gray-500">Rastreo de Pedido</p>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            {user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <User className="h-4 w-4" />
                                        <span className="text-sm font-medium">{user.displayName || user.email}</span>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showUserMenu && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                                            <button
                                                onClick={() => { navigate('/my-orders'); setShowUserMenu(false); }}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                <Wallet className="h-4 w-4" />
                                                Mis pedidos
                                            </button>
                                            <button
                                                onClick={() => { navigate('/'); setShowUserMenu(false); }}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                <ShoppingCart className="h-4 w-4" />
                                                Ir a la tienda
                                            </button>
                                            {(isVerifiedSeller || isAdmin) && (
                                                <button
                                                    onClick={() => { navigate('/dashboard'); setShowUserMenu(false); }}
                                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                                                >
                                                    <LayoutDashboard className="h-4 w-4" />
                                                    Dashboard
                                                </button>
                                            )}
                                            <hr className="my-2" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Cerrar sesión
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                                >
                                    Iniciar Sesión
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sub Header */}
                    <div className="border-t border-gray-200 py-3 flex items-center justify-between">
                        <button
                            onClick={() => navigate('/my-orders')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver a mis pedidos
                        </button>
                        <p className="text-sm text-gray-600">Pedido #{order.number}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">

                {/* Order Info Card */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Fecha de pedido</p>
                            <p className="text-base font-medium text-gray-900">
                                {format(order.createdAt, "dd 'de' MMMM, yyyy", { locale: es })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="text-base font-bold text-blue-600">${order.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Estado</p>
                            <p className="text-base font-medium text-gray-900">{order.status}</p>
                        </div>
                    </div>
                </div>

                {/* Tracking Timeline - HORIZONTAL */}
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-8">Estado del Envío</h2>

                    {order.status === 'cancelled' ? (
                        /* Pedido Cancelado */
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                                <XCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-red-600 mb-2">Pedido Cancelado</h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                                Este pedido fue cancelado y no se procesará.
                            </p>
                        </div>
                    ) : (
                        /* Timeline Horizontal */
                        <div>
                            {/* Barra de progreso horizontal */}
                            <div className="flex items-start justify-between relative mb-4">
                                {trackingStages.map((stage, index) => {
                                    const isCompleted = index <= currentStageIndex;
                                    const isCurrent = index === currentStageIndex;
                                    const Icon = stage.icon;

                                    return (
                                        <React.Fragment key={stage.id}>
                                            {/* Etapa */}
                                            <div className="flex flex-col items-center relative z-10" style={{ flex: '0 0 auto', width: `${100 / trackingStages.length}%` }}>
                                                {/* Círculo */}
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all shadow-md ${isCompleted
                                                    ? 'bg-green-500 border-green-200'
                                                    : isCurrent
                                                        ? 'bg-blue-500 border-blue-200 animate-pulse'
                                                        : 'bg-gray-200 border-gray-300'
                                                    }`}>
                                                    {isCompleted ? (
                                                        <CheckCircle className="h-6 w-6 text-white" />
                                                    ) : isCurrent ? (
                                                        <Clock className="h-6 w-6 text-white" />
                                                    ) : (
                                                        <Icon className="h-6 w-6 text-gray-500" />
                                                    )}
                                                </div>

                                                {/* Label */}
                                                <div className="mt-3 text-center max-w-[100px]">
                                                    <p className={`text-xs font-semibold ${isCompleted ? 'text-green-700' :
                                                        isCurrent ? 'text-blue-700' :
                                                            'text-gray-500'
                                                        }`}>
                                                        {stage.label}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                                                </div>
                                            </div>

                                            {/* Línea conectora */}
                                            {index < trackingStages.length - 1 && (
                                                <div
                                                    className={`h-1 self-start mt-5 flex-1 transition-all ${index < currentStageIndex ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}
                                                    style={{ marginLeft: '-2px', marginRight: '-2px' }}
                                                ></div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* Estado actual */}
                            {currentStageIndex >= 0 && (
                                <div className="text-center mt-8">
                                    <div className="inline-flex items-center px-6 py-3 rounded-full bg-blue-50 border-2 border-blue-200">
                                        <span className="font-semibold text-blue-700">
                                            🚚 {trackingStages[currentStageIndex]?.label}: {trackingStages[currentStageIndex]?.description}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Notification Info */}
                {order.trackingStage === 'ready_pickup' && order.status !== 'cancelled' && (
                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-green-900 mb-1">¡Tu pedido está listo!</h3>
                                <p className="text-sm text-green-800">
                                    Puedes pasar a retirarlo en nuestra bodega de Ecuador.
                                    {order.notificationSent && ' Ya te hemos enviado una notificación.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderTracking;
