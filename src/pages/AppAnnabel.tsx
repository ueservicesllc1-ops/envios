import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CreditCard, CheckCircle, X, DollarSign, ShoppingCart, RotateCcw, FileText } from 'lucide-react';
import { annabelInventoryService, AnnabelInventoryItem } from '../services/annabelInventoryService';
import { annabelPaymentService, AnnabelPayment } from '../services/annabelPaymentService';
import { inventoryService } from '../services/inventoryService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';

type TabType = 'inventario' | 'vendido' | 'devueltos';

const AppAnnabel: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAnonymousAuth();

    const [loading, setLoading] = useState(true);
    const [allItems, setAllItems] = useState<AnnabelInventoryItem[]>([]);

    // Tab activa
    const [activeTab, setActiveTab] = useState<TabType>('inventario');

    // Modal de pago
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [paying, setPaying] = useState(false);

    // Pagos
    const [payments, setPayments] = useState<AnnabelPayment[]>([]);
    const [showReportModal, setShowReportModal] = useState(false);

    // Zoom imagen
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    // Filtrar por status
    const inventoryItems = allItems.filter(i => i.status === 'inventario' && i.quantity > 0);
    const soldItems = allItems.filter(i => i.status === 'vendido');
    const returnedItems = allItems.filter(i => i.status === 'devuelto');

    // Deuda = suma de totalValue de productos en inventario + vendidos - pagos realizados
    const totalProducts = allItems
        .filter(i => i.status === 'inventario' || i.status === 'vendido')
        .reduce((acc, p) => acc + p.totalValue, 0);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalDebt = Math.max(0, totalProducts - totalPaid);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [items, pays] = await Promise.all([
                annabelInventoryService.getAll(),
                annabelPaymentService.getAll()
            ]);
            setAllItems(items);
            setPayments(pays.sort((a, b) => b.date.getTime() - a.date.getTime()));
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            loadData();
        }
    }, [authLoading, user, loadData]);

    const handleMarkAsSold = async (item: AnnabelInventoryItem) => {
        try {
            await annabelInventoryService.markAsSold(item.id);
            toast.success(`"${item.productName}" marcado como vendido`);
            loadData();
        } catch (error) {
            toast.error('Error al marcar como vendido');
        }
    };

    const handleReturn = async (item: AnnabelInventoryItem) => {
        try {
            // Devolver a Bodega Babahoyo
            await inventoryService.addStock(
                item.productId,
                item.quantity,
                0,
                item.unitPrice,
                'Bodega Babahoyo'
            );
            await annabelInventoryService.markAsReturned(item.id);
            toast.success(`"${item.productName}" devuelto a Bodega Babahoyo`);
            loadData();
        } catch (error) {
            toast.error('Error al devolver producto');
        }
    };

    const handlePay = async () => {
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Ingresa un monto válido');
            return;
        }

        setPaying(true);
        try {
            await annabelPaymentService.addPayment(amount);
            toast.success(`Pago de $${amount.toFixed(2)} registrado`);
            setShowPayModal(false);
            setPayAmount('');
            loadData();
        } catch (error) {
            toast.error('Error al registrar el pago');
        } finally {
            setPaying(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    // Componente reutilizable para renderizar una tarjeta de producto
    const ProductCard = ({ item, showSoldButton, showReturnButton }: { item: AnnabelInventoryItem; showSoldButton?: boolean; showReturnButton?: boolean }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div
                className="relative w-full pt-[100%] bg-gray-100 cursor-pointer"
                onClick={() => item.imageUrl && setZoomImage(item.imageUrl)}
            >
                <div className="absolute inset-0">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-300">
                            <Package className="w-10 h-10" />
                        </div>
                    )}
                </div>
                <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                    x{item.quantity}
                </div>
            </div>

            <div className="p-3 flex flex-col flex-1">
                <h4 className="font-bold text-gray-800 text-xs line-clamp-2 mb-1 min-h-[2rem]">
                    {item.productName}
                </h4>
                {item.sku && (
                    <p className="text-[10px] text-gray-400 truncate mb-2">{item.sku}</p>
                )}
                <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500">Precio venta</span>
                    <span className="text-sm font-bold text-purple-600">${item.unitPrice.toFixed(2)}</span>
                </div>

                {(showSoldButton || showReturnButton) && (
                    <div className="mt-2 flex gap-1.5">
                        {showSoldButton && (
                            <button
                                onClick={() => handleMarkAsSold(item)}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center space-x-1 transition-all active:scale-95"
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Vendido</span>
                            </button>
                        )}
                        {showReturnButton && (
                            <button
                                onClick={() => handleReturn(item)}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center space-x-1 transition-all active:scale-95"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Devolver</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-4 py-5 shadow-lg">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Annabel Diaz</h1>
                        <p className="text-purple-100 text-sm">Inventario y Cuenta</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">

                {/* Tarjeta de Deuda */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white">
                        <p className="text-red-100 text-sm mb-1">Deuda Total Pendiente</p>
                        <p className="text-4xl font-bold">${totalDebt.toFixed(2)}</p>
                    </div>
                    <div className="p-4">
                        <button
                            onClick={() => {
                                setPayAmount('');
                                setShowPayModal(true);
                            }}
                            disabled={totalDebt <= 0}
                            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95"
                        >
                            <CreditCard className="w-5 h-5" />
                            <span>Realizar Pago</span>
                        </button>
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95"
                        >
                            <FileText className="w-5 h-5" />
                            <span>Reporte de Pagos</span>
                        </button>
                        {totalDebt <= 0 && (
                            <p className="text-center text-green-600 text-sm font-medium mt-2">
                                ✅ No hay deuda pendiente
                            </p>
                        )}
                    </div>
                </div>

                {/* Pestañas */}
                <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    <button
                        onClick={() => setActiveTab('inventario')}
                        className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${activeTab === 'inventario'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        <span>Inventario ({inventoryItems.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('vendido')}
                        className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${activeTab === 'vendido'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Vendido ({soldItems.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('devueltos')}
                        className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${activeTab === 'devueltos'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Devueltos ({returnedItems.length})</span>
                    </button>
                </div>

                {/* Tab: Inventario */}
                {activeTab === 'inventario' && (
                    <div>
                        {inventoryItems.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">Sin productos en inventario</p>
                                <p className="text-xs mt-1">Aparecerán aquí cuando se transfieran desde Bodega Babahoyo</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {inventoryItems.map(item => (
                                    <ProductCard key={item.id} item={item} showSoldButton showReturnButton />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Vendido */}
                {activeTab === 'vendido' && (
                    <div>
                        {soldItems.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No hay productos vendidos aún</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {soldItems.map(item => (
                                    <ProductCard key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Devueltos */}
                {activeTab === 'devueltos' && (
                    <div>
                        {returnedItems.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                                <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No hay productos devueltos aún</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {returnedItems.map(item => (
                                    <ProductCard key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Pago */}
            {showPayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPayModal(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10">
                        <div className="bg-purple-600 px-5 py-4 flex items-center justify-between text-white">
                            <h3 className="font-bold text-lg flex items-center">
                                <DollarSign className="w-5 h-5 mr-2" />
                                Registrar Pago
                            </h3>
                            <button
                                onClick={() => setShowPayModal(false)}
                                className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-500">
                                Deuda total: <span className="font-bold text-red-600">${totalDebt.toFixed(2)}</span>
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Monto a Pagar
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        placeholder="0.00"
                                        autoFocus
                                        min="0.01"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePay}
                                disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95"
                            >
                                {paying ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Confirmar Pago</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reporte de Pagos */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowReportModal(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10 max-h-[85vh] flex flex-col">
                        <div className="bg-gray-800 px-5 py-4 flex items-center justify-between text-white">
                            <h3 className="font-bold text-lg flex items-center">
                                <FileText className="w-5 h-5 mr-2" />
                                Reporte de Pagos
                            </h3>
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total pagado:</span>
                                <span className="font-bold text-green-600">${totalPaid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-500">Deuda restante:</span>
                                <span className="font-bold text-red-600">${totalDebt.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {payments.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No hay pagos registrados</p>
                                </div>
                            ) : (
                                payments.map(p => (
                                    <div key={p.id} className="bg-gray-50 rounded-xl p-3 flex justify-between items-center border border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-400">
                                                {p.date.toLocaleDateString('es-EC', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })} — {p.date.toLocaleTimeString('es-EC', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            {p.notes && <p className="text-xs text-gray-500 mt-0.5">{p.notes}</p>}
                                        </div>
                                        <span className="text-lg font-bold text-green-600">${p.amount.toFixed(2)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Zoom Imagen */}
            {zoomImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setZoomImage(null)}
                >
                    <img
                        src={zoomImage}
                        alt="Zoom"
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                    <button
                        className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full"
                        onClick={() => setZoomImage(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppAnnabel;
