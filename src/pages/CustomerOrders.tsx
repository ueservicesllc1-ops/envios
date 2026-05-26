import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ShoppingBag, Home, Grid, PlusSquare, ShoppingCart, User, HelpCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { onlineSaleService } from '../services/onlineSaleService';
import { productService } from '../services/productService';
import { getImageUrl } from '../utils/imageUtils';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const CustomerOrders: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [activeTab, setActiveTab] = useState('Todos');

    useEffect(() => {
        let unsubscribe: () => void;
        const setupSubscription = async () => {
            if (authLoading) return;
            if (!user?.email) {
                navigate('/login');
                return;
            }

            setLoadingOrders(true);
            unsubscribe = onlineSaleService.subscribeToUserOrders(user.email, async (sales) => {
                const processedOrders = await Promise.all(sales.map(async (sale) => {
                    const orderWithDate = {
                        ...sale,
                        estimatedDelivery: addDays(sale.createdAt, Math.floor(Math.random() * 4) + 12)
                    };
                    const itemsWithImages = await Promise.all(sale.items.map(async (item: any) => {
                        if (!item.imageUrl && item.productId) {
                            try {
                                const product = await productService.getById(item.productId);
                                if (product?.imageUrl) {
                                    return { ...item, imageUrl: product.imageUrl };
                                }
                            } catch (e) {}
                        }
                        return item;
                    }));
                    return { ...orderWithDate, items: itemsWithImages };
                }));
                // Ordenar más recientes primero, protegiendo contra fechas inválidas
                processedOrders.sort((a, b) => {
                    const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
                    const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
                    if (isNaN(timeA) || isNaN(timeB)) return 0;
                    return timeB - timeA;
                });
                setOrders(processedOrders);
                setLoadingOrders(false);
            });
        };
        setupSubscription();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, authLoading, navigate]);

    if (authLoading || loadingOrders) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    const filteredOrders = orders.filter(order => {
        if (activeTab === 'Todos') return true;
        if (activeTab === 'En camino') return order.status === 'pending' || order.status === 'confirmed';
        if (activeTab === 'Completados') return order.status === 'delivered' || order.status === 'completed';
        if (activeTab === 'Cancelados') return order.status === 'cancelled';
        return true;
    });

    const getStatusStyles = (status: string) => {
        switch(status) {
            case 'confirmed':
            case 'pending':
                return 'bg-green-100 text-green-800';
            case 'delivered':
            case 'completed':
                return 'bg-gray-200 text-gray-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch(status) {
            case 'confirmed':
            case 'pending':
                return 'En camino';
            case 'delivered':
            case 'completed':
                return 'Entregado';
            case 'cancelled':
                return 'Cancelado';
            default:
                return 'Procesando';
        }
    };

    return (
        <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans">
            {/* TopAppBar */}
            <header className="fixed top-0 w-full z-50 bg-white border-b border-gray-200 flex justify-between items-center px-4 h-14">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/vibe-market')} className="active:scale-95 transition-transform text-orange-600">
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-extrabold text-orange-600">ShopVibe</h1>
                </div>
                <button onClick={() => navigate('/cart')} className="active:scale-95 transition-transform text-orange-600">
                    <ShoppingBag className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-grow pt-14 pb-24 px-4 max-w-2xl mx-auto w-full">
                {/* Main Heading */}
                <section className="mt-6 mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Mis Pedidos</h2>
                </section>

                {/* Tab Navigation */}
                <nav className="flex overflow-x-auto gap-2 mb-6 sticky top-14 bg-gray-50/95 backdrop-blur-sm py-2 z-40" style={{ scrollbarWidth: 'none' }}>
                    {['Todos', 'En camino', 'Completados', 'Cancelados'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm shadow-sm transition-all ${
                                activeTab === tab 
                                    ? 'bg-orange-600 text-white' 
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>

                {/* Order List */}
                <div className="flex flex-col gap-4">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No hay pedidos en esta categoría.</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => (
                            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4 transition-all active:scale-[0.98] shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-sm text-gray-700 mb-1">#{order.number}</p>
                                        <p className="text-sm text-gray-500">{format(order.createdAt, "dd 'de' MMMM, yyyy", { locale: es })}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded font-bold text-[11px] uppercase tracking-wider ${getStatusStyles(order.status)}`}>
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                    {order.items.slice(0, 3).map((item: any, idx: number) => (
                                        item.imageUrl ? (
                                            <img key={idx} src={getImageUrl(item.imageUrl)} alt={item.productName} className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                                        ) : (
                                            <div key={idx} className="w-16 h-16 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-200 flex-shrink-0">
                                                <ShoppingBag className="w-6 h-6 text-gray-300" />
                                            </div>
                                        )
                                    ))}
                                    {order.items.length > 3 && (
                                        <div className="w-16 h-16 flex-shrink-0 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 font-bold text-sm">
                                            +{order.items.length - 3}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Total</span>
                                        <span className="text-orange-600 font-black text-lg">${order.totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/track-order/${order.id}`)}
                                        className="bg-orange-600 text-white px-5 py-2 rounded-lg font-bold text-sm active:scale-95 transition-all shadow-sm hover:bg-orange-700"
                                    >
                                        Rastrear Pedido
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Help Section */}
                <section className="mt-12 p-6 bg-gray-200 rounded-2xl flex flex-col items-center text-center">
                    <HelpCircle className="text-orange-600 w-10 h-10 mb-2" />
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">¿Necesitas ayuda con un pedido?</h3>
                    <p className="text-sm text-gray-600 mb-4">Nuestro equipo de soporte está disponible 24/7 para ayudarte con cualquier inconveniente.</p>
                    <button className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold active:scale-95 transition-transform hover:bg-gray-800">
                        Contactar Soporte
                    </button>
                </section>
            </main>

            {/* BottomNavBar */}
            <nav className="fixed bottom-0 w-full z-50 rounded-t-xl bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex justify-around items-center py-2 px-2 pb-safe border-t border-gray-100">
                <button onClick={() => navigate('/vibe-market')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
                    <Home className="w-6 h-6 mb-1" />
                    <span className="font-bold text-[10px]">Inicio</span>
                </button>
                <button className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
                    <Grid className="w-6 h-6 mb-1" />
                    <span className="font-bold text-[10px]">Categorías</span>
                </button>
                <button className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
                    <PlusSquare className="w-6 h-6 mb-1" />
                    <span className="font-bold text-[10px]">Nuevo</span>
                </button>
                <button onClick={() => navigate('/cart')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150">
                    <ShoppingCart className="w-6 h-6 mb-1" />
                    <span className="font-bold text-[10px]">Carrito</span>
                </button>
                <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-orange-600 font-bold active:scale-90 transition-all duration-150">
                    <User className="w-6 h-6 mb-1" />
                    <span className="font-bold text-[10px]">Perfil</span>
                </button>
            </nav>
        </div>
    );
};

export default CustomerOrders;
