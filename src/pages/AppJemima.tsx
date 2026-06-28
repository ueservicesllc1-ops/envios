import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CreditCard, CheckCircle, X, DollarSign, ShoppingCart, RotateCcw, FileText, LogOut, EyeOff, Download } from 'lucide-react';
import { jemimaInventoryService, JemimaInventoryItem } from '../services/jemimaInventoryService';
import { jemimaPaymentService, JemimaPayment } from '../services/jemimaPaymentService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';
import { getSellerSession, clearSellerSession, SellerSession } from '../utils/sellerSession';
import { generateSellerAppInventoryPDF } from '../utils/pdfGenerator';

type TabType = 'inventario' | 'vendido' | 'devueltos';

const AppJemima: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAnonymousAuth();
    const [session, setSessionState] = useState<SellerSession | null>(null);
    // isReadOnly: las demás vendedoras pueden ver pero no editar pagos (solo admin/superAdmin o la propia Jemima)
    const isReadOnly = !session?.isSuperAdmin && !session?.isAdmin && session?.id !== 'jemima';

    const [loading, setLoading] = useState(true);
    const [allItems, setAllItems] = useState<JemimaInventoryItem[]>([]);

    const [activeTab, setActiveTab] = useState<TabType>('inventario');

    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [paying, setPaying] = useState(false);

    const [payments, setPayments] = useState<JemimaPayment[]>([]);
    const [showReportModal, setShowReportModal] = useState(false);

    const [zoomImage, setZoomImage] = useState<string | null>(null);

    const inventoryItems = allItems.filter(i => i.status === 'inventario' && i.quantity > 0);
    const soldItems = allItems.filter(i => i.status === 'vendido');
    const returnedItems = allItems.filter(i => i.status === 'devuelto');

    const totalProducts = allItems
        .filter(i => i.status === 'inventario' || i.status === 'vendido')
        .reduce((acc, p) => acc + p.totalValue, 0);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalDebt = Math.max(0, totalProducts - totalPaid);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [items, pays] = await Promise.all([
                jemimaInventoryService.getAll(),
                jemimaPaymentService.getAll()
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
        const s = getSellerSession();
        if (!s) { navigate('/app', { replace: true }); return; }
        // Solo requiere sesión activa; el PIN ya fue validado en AppMobile
        setSessionState(s);
    }, [navigate]);


    useEffect(() => {
        if (!authLoading && user) {
            loadData();
        }
    }, [authLoading, user, loadData]);

    const handleLogout = () => {
        clearSellerSession();
        navigate('/app', { replace: true });
    };

    const handlePay = async () => {
        const amount = parseFloat(payAmount);
        if (!amount || amount <= 0) { toast.error('Ingresa un monto válido'); return; }
        setPaying(true);
        try {
            await jemimaPaymentService.add(amount, 'Pago registrado');
            toast.success(`Pago de $${amount.toFixed(2)} registrado`);
            setShowPayModal(false);
            setPayAmount('');
            loadData();
        } catch (error) {
            toast.error('Error al registrar pago');
        } finally {
            setPaying(false);
        }
    };

    const handleMarkSold = async (item: JemimaInventoryItem) => {
        if (!window.confirm(`¿Marcar "${item.productName}" como vendido?`)) return;
        try {
            await jemimaInventoryService.markAsSold(item.id);
            toast.success('Producto marcado como vendido');
            loadData();
        } catch { toast.error('Error al actualizar'); }
    };

    const handleReturn = async (item: JemimaInventoryItem) => {
        if (!window.confirm(`¿Devolver "${item.productName}" a Bodega Luis?`)) return;
        try {
            await jemimaInventoryService.markAsReturned(item.id);
            // Devolver a Bodega Luis
            const { bodegaLuisInventoryService } = await import('../services/bodegaLuisInventoryService');
            await bodegaLuisInventoryService.addStock(
                item.productId,
                item.productName,
                item.sku,
                item.imageUrl || '',
                item.quantity,
                0,
                item.unitPrice
            );
            toast.success('Producto devuelto a Bodega Luis');
            loadData();
        } catch { toast.error('Error al devolver producto'); }
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    const ProductCard = ({ item, showSoldButton = false, showReturnButton = false }: {
        item: JemimaInventoryItem;
        showSoldButton?: boolean;
        showReturnButton?: boolean;
    }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div
                className="relative w-full pt-[100%] bg-gray-100 cursor-pointer"
                onClick={() => item.imageUrl && setZoomImage(item.imageUrl)}
            >
                <div className="absolute inset-0">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package className="w-10 h-10" />
                        </div>
                    )}
                </div>
                <div className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md ${item.quantity < 3 ? 'bg-red-500' : 'bg-orange-500'}`}>
                    x{item.quantity}
                </div>
            </div>
            <div className="p-3 flex flex-col flex-1">
                <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">{item.productName}</p>
                <p className="text-[10px] text-gray-400 mb-2">{item.sku}</p>
                <div className="mt-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-gray-400">Precio</span>
                        <span className="text-sm font-bold text-orange-500">${item.unitPrice.toFixed(2)}</span>
                    </div>
                    {(showSoldButton || showReturnButton) && (
                        <div className="flex space-x-1">
                            {showSoldButton && (
                                <button
                                    onClick={() => handleMarkSold(item)}
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
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header Naranja */}
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-5 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => navigate('/app')} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Jemima Vergara 🌟</h1>
                            <p className="text-orange-100 text-sm flex items-center space-x-1">
                                {isReadOnly && <><EyeOff className="w-3 h-3" /><span>Solo lectura</span></>}
                                {!isReadOnly && <span>Inventario y Cuenta</span>}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span>Salir</span>
                    </button>
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
                        {!isReadOnly && (
                            <button onClick={() => { setPayAmount(''); setShowPayModal(true); }} disabled={totalDebt <= 0}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95">
                                <CreditCard className="w-5 h-5" />
                                <span>Registrar Pago</span>
                            </button>
                        )}
                        <button onClick={() => setShowReportModal(true)}
                            className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95">
                            <FileText className="w-5 h-5" />
                            <span>Reporte de Pagos</span>
                        </button>
                        {totalDebt <= 0 && (
                            <p className="text-center text-green-600 text-sm font-medium mt-2">✅ No hay deuda pendiente</p>
                        )}
                    </div>
                </div>

                {/* Pestañas */}
                <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    <button onClick={() => setActiveTab('inventario')}
                        className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${activeTab === 'inventario' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Package className="w-4 h-4" />
                        <span>Inventario ({inventoryItems.length})</span>
                    </button>
                    <button onClick={() => setActiveTab('vendido')}
                        className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${activeTab === 'vendido' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Vendido ({soldItems.length})</span>
                    </button>
                    <button onClick={() => setActiveTab('devueltos')}
                        className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${activeTab === 'devueltos' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
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
                                <p className="text-xs mt-1">Los productos aparecerán cuando se transfieran desde Bodega Luis</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {inventoryItems.map(item => (
                                    <ProductCard key={item.id} item={item} showSoldButton={!isReadOnly} showReturnButton={!isReadOnly} />
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
                                {soldItems.map(item => <ProductCard key={item.id} item={item} showReturnButton={!isReadOnly} />)}
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
                                {returnedItems.map(item => <ProductCard key={item.id} item={item} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Pago */}
            {showPayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10">
                        <div className="bg-orange-500 px-5 py-4 flex items-center justify-between text-white">
                            <h3 className="font-bold text-lg flex items-center">
                                <DollarSign className="w-5 h-5 mr-2" />Registrar Pago
                            </h3>
                            <button onClick={() => setShowPayModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-500">Deuda total: <span className="font-bold text-red-600">${totalDebt.toFixed(2)}</span></p>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Monto a Pagar</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-bold text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        placeholder="0.00" autoFocus min="0.01" step="0.01" />
                                </div>
                            </div>
                            <button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
                                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 hover:bg-orange-600">
                                {paying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
                                    <><CheckCircle className="w-5 h-5" /><span>Confirmar Pago</span></>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reporte de Pagos */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10 max-h-[85vh] flex flex-col">
                        <div className="bg-gray-800 px-5 py-4 flex items-center justify-between text-white">
                            <h3 className="font-bold text-lg flex items-center"><FileText className="w-5 h-5 mr-2" />Reporte de Pagos</h3>
                            <button onClick={() => setShowReportModal(false)} className="hover:bg-white/20 p-1 rounded-lg"><X className="w-6 h-6" /></button>
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
                                                {p.date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
                    <img src={zoomImage} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg" />
                    <button className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full" onClick={() => setZoomImage(null)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppJemima;
