import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, Package, TrendingUp, Calendar, ChevronRight, Truck, CheckCircle, Clock, CreditCard, X, Box, FileText, ClipboardList } from 'lucide-react';
import { Seller, ExitNote, SellerInventoryItem } from '../types';
import { sellerService } from '../services/sellerService';
import { exitNoteService } from '../services/exitNoteService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { paymentNoteService } from '../services/paymentNoteService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';

const AppVendedorDashboard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Autenticación anónima para acceso a Firestore
    const { user, loading: authLoading, error: authError } = useAnonymousAuth();

    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [sellerNotes, setSellerNotes] = useState<ExitNote[]>([]);
    const [inventory, setInventory] = useState<SellerInventoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<'shipments' | 'inventory' | 'accounting'>('shipments');

    // Filtro de notas
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

    // Estados para Pago
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState<ExitNote | null>(null); // Si es null, es pago global
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    // Zoom Imagen
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const loadData = React.useCallback(async () => {
        try {
            setLoading(true);

            // Cargar datos del vendedor primero
            let sellerData: Seller | null = null;
            try {
                sellerData = await sellerService.getById(id!);
                if (!sellerData) {
                    toast.error('Vendedor no encontrado');
                    navigate('/app');
                    return;
                }
                setSeller(sellerData);
            } catch (sellerError) {
                console.error('Error loading seller:', sellerError);
                toast.error('Error al cargar datos del vendedor');
                navigate('/app');
                return;
            }

            // Cargar notas de salida
            try {
                const exitNotesData = await exitNoteService.getAll();

                // Filtrar notas del vendedor y ordenar por fecha descendente
                const notes = exitNotesData
                    .filter(n => n.sellerId === id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setSellerNotes(notes);
            } catch (notesError) {
                console.error('Error loading exit notes:', notesError);
                // No mostrar toast aquí para no saturar si falla algo secundario
                setSellerNotes([]);
            }

            // Cargar inventario del vendedor
            try {
                const inventoryData = await sellerInventoryService.getBySeller(id!);
                setInventory(inventoryData);
            } catch (inventoryError) {
                console.error('Error loading inventory:', inventoryError);
                setInventory([]);
            }

        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (!authLoading && user && id) {
            loadData();
        }
        if (authError) {
            toast.error('Error de autenticación. Por favor, recarga la página.');
        }
    }, [id, loadData, authLoading, user, authError]);

    const getStatusInfo = (rawStatus: string) => {
        const s = (rawStatus || '').toLowerCase();

        if (s === 'pending' || s === 'pendiente') return { label: 'Pendiente', color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock };
        if (s === 'in-transit' || s === 'en camino' || s === 'en-camino' || s === 'transito') return { label: 'En Camino', color: 'text-blue-600', bg: 'bg-blue-100', icon: Truck };
        if (s === 'delivered' || s === 'entregado') return { label: 'En Camino', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
        if (s === 'received' || s === 'recibido') return { label: 'Recibido', color: 'text-purple-600', bg: 'bg-purple-100', icon: CheckCircle };

        return { label: rawStatus, color: 'text-gray-600', bg: 'bg-gray-100', icon: Package };
    };

    const filteredNotes = sellerNotes.filter(note => {
        const s = (note.status || '').toLowerCase();
        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') return [
            'pending', 'pendiente',
            'in-transit', 'en camino', 'en-camino', 'transito'
        ].includes(s);
        if (filterStatus === 'completed') return [
            'delivered', 'entregado',
            'received', 'recibido',
            'cancelled', 'cancelado'
        ].includes(s);
        return true;
    });

    // Calcular deuda total (Sumatoria de notas no pagadas)
    // Asumimos que la deuda histórica (si existe en seller.totalDebt) es adicional o ya está integrada.
    // Para simplificar y ser consistente con las notas mostradas:
    const calculateTotalDebt = () => {
        let debt = 0;
        sellerNotes.forEach(note => {
            const total = note.totalPrice || 0;
            const paid = note.amountPaid || 0;
            // Solo contar positivos
            if (total > paid) {
                debt += (total - paid);
            }
        });
        return debt;
    };

    const totalDebt = calculateTotalDebt();

    const handlePayClick = (note: ExitNote | null, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedNote(note);

        if (note) {
            // Pago específico
            const pending = Math.max(0, (note.totalPrice || 0) - (note.amountPaid || 0));
            setPaymentAmount(pending.toFixed(2));
        } else {
            // Pago global
            setPaymentAmount('');
        }
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Ingrese un monto válido');
            return;
        }

        setProcessingPayment(true);
        try {
            if (selectedNote) {
                // Pago a nota específica
                const currentPaid = selectedNote.amountPaid || 0;
                const newTotalPaid = currentPaid + amount;
                const total = selectedNote.totalPrice || 0;

                const isPaid = newTotalPaid >= (total - 0.01);
                const newStatus = isPaid ? 'paid' : 'partial';

                await exitNoteService.update(selectedNote.id, {
                    amountPaid: newTotalPaid,
                    paymentStatus: newStatus
                });

                // Opcional: Crear registro en PaymentNotes para trazabilidad
                try {
                    await paymentNoteService.create({
                        number: `PAY-${Date.now()}`,
                        totalAmount: amount,
                        status: 'approved', // Auto-aprobado por el usuario (o pending si se requiere revisión)
                        paymentMethod: 'cash',
                        notes: `Pago a nota ${selectedNote.number}`,
                        sellerId: seller?.id,
                        sellerName: seller?.name,
                        items: []
                    } as any);
                } catch (e) { console.warn("No se pudo crear nota de pago", e); }

                toast.success('Pago registrado exitosamente');
            } else {
                // Pago Global (Distribuir)
                let remainingAmount = amount;

                // Ordenar notas por fecha (más antiguas primero) para pagar deuda vieja
                // Filtrar solo las que tienen deuda pendiente
                const pendingNotes = sellerNotes.filter(n => {
                    const t = n.totalPrice || 0;
                    const p = n.amountPaid || 0;
                    return t > p;
                }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                let notesPaidCount = 0;

                for (const note of pendingNotes) {
                    if (remainingAmount <= 0.01) break;

                    const pending = (note.totalPrice || 0) - (note.amountPaid || 0);
                    const toPay = Math.min(pending, remainingAmount);

                    if (toPay > 0) {
                        const newTotalPaid = (note.amountPaid || 0) + toPay;
                        const isPaid = newTotalPaid >= ((note.totalPrice || 0) - 0.01);

                        await exitNoteService.update(note.id, {
                            amountPaid: newTotalPaid,
                            paymentStatus: isPaid ? 'paid' : 'partial'
                        });

                        remainingAmount -= toPay;
                        notesPaidCount++;
                    }
                }

                // Crear registro global de pago
                try {
                    await paymentNoteService.create({
                        number: `PAY-GLOBAL-${Date.now()}`,
                        totalAmount: amount,
                        status: 'approved',
                        paymentMethod: 'cash',
                        notes: `Abono a deuda general. Aplicado a ${notesPaidCount} notas.`,
                        sellerId: seller?.id,
                        sellerName: seller?.name,
                        items: []
                    } as any);
                } catch (e) { console.warn("No se pudo crear nota de pago global", e); }


                if (remainingAmount > 0.01) {
                    toast.success(`Pago registrado. Quedaron $${remainingAmount.toFixed(2)} a favor (no aplicados).`);
                } else {
                    toast.success('Abono registrado exitosamente');
                }
            }

            setShowPaymentModal(false);
            setPaymentAmount('');
            setSelectedNote(null);
            loadData(); // Recargar datos
        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error('Error al registrar el pago');
        } finally {
            setProcessingPayment(false);
        }
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!seller) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Índigo */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white sticky top-0 z-40 shadow-lg px-4 py-4 rounded-b-3xl">
                <div className="flex items-center space-x-3 mb-4">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">Mi Dashboard</h1>
                        <p className="text-indigo-200 text-sm">{seller.name}</p>
                    </div>
                    {/* Indicador de Deuda en Header */}
                    <div className="bg-indigo-900/50 px-3 py-1 rounded-lg">
                        <span className="text-xs text-indigo-300 block">Deuda</span>
                        <span className="font-bold text-white">${totalDebt.toFixed(2)}</span>
                    </div>
                </div>

                {/* Tabs de Navegación */}
                <div className="flex space-x-2 mt-2">
                    <button
                        onClick={() => setActiveTab('shipments')}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center ${activeTab === 'shipments' ? 'bg-white text-indigo-600 shadow-md' : 'bg-indigo-700/50 text-indigo-200 hover:bg-indigo-700'}`}
                    >
                        <Box className="w-5 h-5 mb-1" />
                        <span>Envíos</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-md' : 'bg-indigo-700/50 text-indigo-200 hover:bg-indigo-700'}`}
                    >
                        <ClipboardList className="w-5 h-5 mb-1" />
                        <span>Inventario</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('accounting')}
                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center ${activeTab === 'accounting' ? 'bg-white text-indigo-600 shadow-md' : 'bg-indigo-700/50 text-indigo-200 hover:bg-indigo-700'}`}
                    >
                        <FileText className="w-5 h-5 mb-1" />
                        <span>Cuentas</span>
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="p-4">

                {/* 1. Tab Envíos */}
                {activeTab === 'shipments' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Filtros */}
                        <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4">
                            <button className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${filterStatus === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setFilterStatus('all')}>Todos</button>
                            <button className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${filterStatus === 'active' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setFilterStatus('active')}>Activos</button>
                            <button className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${filterStatus === 'completed' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setFilterStatus('completed')}>Completados</button>
                        </div>

                        {filteredNotes.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>No hay envíos registrados</p>
                            </div>
                        ) : (
                            filteredNotes.map(note => {
                                const statusInfo = getStatusInfo(note.status);
                                const StatusIcon = statusInfo.icon;
                                const isPaid = note.paymentStatus === 'paid';
                                const isPartial = note.paymentStatus === 'partial';
                                const paidAmount = note.amountPaid || 0;
                                const pendingAmount = Math.max(0, (note.totalPrice || 0) - paidAmount);

                                return (
                                    <div key={note.id} onClick={() => navigate(`/app/en-camino/${note.id}`)} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md mb-3">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                                                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{note.number}</p>
                                                    <p className="text-xs text-gray-500">{new Date(note.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end space-y-1">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>{statusInfo.label}</span>
                                                {isPaid ? (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">PAGADO</span>
                                                ) : (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPartial ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-red-500 bg-red-50 border-red-200'}`}>{isPartial ? 'PARCIAL' : 'PENDIENTE'}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-50 pt-3">
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <span className="text-gray-500">{note.items.length} productos</span>
                                                <div className="text-right">
                                                    <span className="font-bold text-indigo-600 text-lg">${note.totalPrice.toFixed(2)}</span>
                                                    {!isPaid && paidAmount > 0 && <p className="text-[10px] text-gray-400">Abonado: ${paidAmount.toFixed(2)}</p>}
                                                </div>
                                            </div>
                                            {!isPaid && (
                                                <button onClick={(e) => handlePayClick(note, e)} className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 rounded-lg text-sm flex items-center justify-center transition-colors">
                                                    <CreditCard className="w-4 h-4 mr-2" />
                                                    Pagar ${pendingAmount.toFixed(2)}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* 2. Tab Inventario */}
                {activeTab === 'inventory' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4">
                            <h3 className="text-indigo-800 font-bold mb-1">Mi Stock Actual</h3>
                            <p className="text-xs text-indigo-600">Productos transferidos desde Bodega Ecuador.</p>
                        </div>

                        {inventory.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>No hay productos en inventario.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {inventory.map(item => (
                                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                        <div
                                            className="relative w-full pt-[100%] bg-gray-100 cursor-pointer"
                                            onClick={() => item.product.imageUrl && setSelectedImage(item.product.imageUrl)}
                                        >
                                            <div className="absolute inset-0">
                                                {item.product.imageUrl ? (
                                                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-300"><Package className="w-10 h-10" /></div>
                                                )}
                                            </div>
                                            <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                                                x{item.quantity}
                                            </div>
                                        </div>
                                        <div className="p-3 flex flex-col flex-1">
                                            <h4 className="font-bold text-gray-800 text-xs line-clamp-2 h-8 mb-1">{item.product.name}</h4>
                                            <p className="text-[10px] text-gray-400 mb-2 truncate">{item.product.sku}</p>
                                            <div className="mt-auto border-t border-gray-50 pt-2 flex justify-between items-center">
                                                <span className="text-[10px] text-gray-500">Precio Venta</span>
                                                <span className="text-sm font-bold text-indigo-600">${item.unitPrice?.toFixed(2) || item.product.salePrice1?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Tab Contabilidad */}
                {activeTab === 'accounting' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Tarjeta de Deuda Total */}
                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                            <div className="relative z-10">
                                <p className="text-red-100 text-sm font-medium mb-1">Deuda Total Pendiente</p>
                                <h2 className="text-4xl font-bold mb-4">${totalDebt.toFixed(2)}</h2>
                                <button
                                    onClick={(e) => handlePayClick(null, e)} // null = pago global
                                    className="bg-white text-red-600 w-full py-3 rounded-xl font-bold shadow-md hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center"
                                >
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Realizar Abono a Deuda
                                </button>
                            </div>
                        </div>

                        {/* Resumen */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                                Resumen Financiero
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Total Envíos (Activos)</span>
                                    <span className="font-bold text-gray-900">{sellerNotes.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-sm text-gray-600">Notas Pendientes de Pago</span>
                                    <span className="font-bold text-red-500">{sellerNotes.filter(n => (n.totalPrice || 0) > (n.amountPaid || 0)).length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Pago */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPaymentModal(false)}
                    ></div>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden animate-scale-up">
                        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold">{selectedNote ? `Pago a Nota ${selectedNote.number}` : 'Abono a Deuda General'}</h3>
                            <button onClick={() => setShowPaymentModal(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                {selectedNote
                                    ? `Ingresa el monto a pagar para la nota ${selectedNote.number}`
                                    : 'El abono se aplicará automáticamente a las notas más antiguas con saldo pendiente.'}
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto a Pagar</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                                <div className="mt-2 flex justify-between text-xs text-gray-400">
                                    <span>{selectedNote ? `Deuda nota: $${(selectedNote.totalPrice - (selectedNote.amountPaid || 0)).toFixed(2)}` : `Deuda Total: $${totalDebt.toFixed(2)}`}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmPayment}
                                disabled={processingPayment || !paymentAmount}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center"
                            >
                                {processingPayment ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent"></div>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Confirmar Pago
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Zoom Imagen */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Zoom"
                        className="max-w-full max-h-full object-contain rounded-lg animate-fade-in"
                    />
                    <button
                        className="absolute top-4 right-4 text-white p-2 bg-black bg-opacity-50 rounded-full"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppVendedorDashboard;
