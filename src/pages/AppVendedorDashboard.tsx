import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, Package, TrendingUp, Calendar, ChevronRight, Truck, CheckCircle, Clock, CreditCard, X } from 'lucide-react';
import { Seller, ExitNote } from '../types';
import { sellerService } from '../services/sellerService';
import { exitNoteService } from '../services/exitNoteService';
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

    // Filtro de notas
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

    // Estados para Pago
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState<ExitNote | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

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
                toast.error('Error al cargar las notas de salida');
                // No retornar aquí - permitir que la página se muestre con el vendedor
                setSellerNotes([]);
            }

        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        // Solo cargar datos si la autenticación está completa y hay un usuario
        if (!authLoading && user && id) {
            loadData();
        }

        // Si hay error de autenticación, mostrar mensaje
        if (authError) {
            toast.error('Error de autenticación. Por favor, recarga la página.');
        }
    }, [id, loadData, authLoading, user, authError]);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Pendiente', color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock };
            case 'in-transit': return { label: 'En Camino', color: 'text-blue-600', bg: 'bg-blue-100', icon: Truck };
            case 'delivered': return { label: 'En Camino', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
            case 'received': return { label: 'Recibido', color: 'text-purple-600', bg: 'bg-purple-100', icon: CheckCircle };
            default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: Package };
        }
    };

    const filteredNotes = sellerNotes.filter(note => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') return ['pending', 'in-transit'].includes(note.status);
        if (filterStatus === 'completed') return ['delivered', 'received', 'cancelled'].includes(note.status);
        return true;
    });

    const handlePayClick = (note: ExitNote, e: React.MouseEvent) => {
        e.stopPropagation(); // Evitar abrir detalles
        setSelectedNote(note);

        // Calcular pendiente
        const total = note.totalPrice || 0;
        const paid = note.amountPaid || 0;
        const pending = Math.max(0, total - paid);

        setPaymentAmount(pending.toFixed(2));
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedNote || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Ingrese un monto válido');
            return;
        }

        setProcessingPayment(true);
        try {
            const currentPaid = selectedNote.amountPaid || 0;
            const newTotalPaid = currentPaid + amount;
            const total = selectedNote.totalPrice || 0;

            // Determinar nuevo estado (margen de error de centavos)
            const isPaid = newTotalPaid >= (total - 0.01);
            const newStatus = isPaid ? 'paid' : 'partial';

            await exitNoteService.update(selectedNote.id, {
                amountPaid: newTotalPaid,
                paymentStatus: newStatus
            });

            toast.success('Pago registrado exitosamente');
            setShowPaymentModal(false);
            setPaymentAmount('');
            setSelectedNote(null);

            // Recargar datos para ver cambios
            loadData();
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
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white sticky top-0 z-50 shadow-lg px-4 py-6 rounded-b-3xl">
                <div className="flex items-center space-x-3 mb-6">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">Mi Dashboard</h1>
                        <p className="text-indigo-200 text-sm">Hola, {seller.name}</p>
                    </div>
                </div>
            </div>

            {/* Filtros de Notas */}
            <div className="px-4 mt-6">
                <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${filterStatus === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        Todos
                    </button>
                    <button
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${filterStatus === 'active' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setFilterStatus('active')}
                    >
                        Activos
                    </button>
                    <button
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${filterStatus === 'completed' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setFilterStatus('completed')}
                    >
                        Completados
                    </button>
                </div>
            </div>

            {/* Lista de Notas de Salida */}
            <div className="px-4 mt-4 pb-6 space-y-4">
                <h3 className="text-gray-800 font-bold text-lg">Mis Envíos</h3>

                {filteredNotes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No tienes envíos en esta categoría</p>
                    </div>
                ) : (
                    filteredNotes.map(note => {
                        const statusInfo = getStatusInfo(note.status);
                        const StatusIcon = statusInfo.icon;

                        const isPaid = note.paymentStatus === 'paid';
                        const isPartial = note.paymentStatus === 'partial';
                        const paidAmount = note.amountPaid || 0;
                        const pendingAmount = note.totalPrice - paidAmount;

                        return (
                            <div
                                key={note.id}
                                onClick={() => navigate(`/app/en-camino/${note.id}`)}
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                                            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{note.number}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(note.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </span>
                                        {/* Badge de Pago */}
                                        {isPaid ? (
                                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                PAGADO
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPartial ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-red-500 bg-red-50 border-red-200'}`}>
                                                {isPartial ? 'PARCIAL' : 'PENDIENTE'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-gray-50 pt-3">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-gray-500">{note.items.length} productos</span>
                                        <div className="text-right">
                                            <span className="font-bold text-indigo-600 text-lg">${note.totalPrice.toFixed(2)}</span>
                                            {!isPaid && paidAmount > 0 && (
                                                <p className="text-[10px] text-gray-400">Pagado: ${paidAmount.toFixed(2)}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botón de Pagar si no está pagado completo */}
                                    {!isPaid && (
                                        <button
                                            onClick={(e) => handlePayClick(note, e)}
                                            className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 rounded-lg text-sm flex items-center justify-center transition-colors"
                                        >
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

            {/* Modal de Pago */}
            {showPaymentModal && selectedNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowPaymentModal(false)}
                    ></div>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden animate-fade-in">
                        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold">Registrar Pago</h3>
                            <button onClick={() => setShowPaymentModal(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 mb-4">
                                Ingresa el monto a pagar para la nota <span className="font-bold text-gray-800">{selectedNote.number}</span>
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
                                    />
                                </div>
                                <div className="mt-2 flex justify-between text-xs text-gray-400">
                                    <span>Total deuda: ${(selectedNote.totalPrice - (selectedNote.amountPaid || 0)).toFixed(2)}</span>
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
        </div>
    );
};

export default AppVendedorDashboard;
