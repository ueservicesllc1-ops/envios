import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Upload, Download, CreditCard, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Seller, ExitNote, PaymentNote } from '../types';
import { sellerService } from '../services/sellerService';
import { exitNoteService } from '../services/exitNoteService';
import { paymentNoteService } from '../services/paymentNoteService';
import toast from 'react-hot-toast';

import { generateSellerBalancePDF } from '../utils/pdfGenerator';

const SellerBalanceDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [sentExitNotes, setSentExitNotes] = useState<ExitNote[]>([]);
    const [receivedExitNotes, setReceivedExitNotes] = useState<ExitNote[]>([]);
    const [paymentNotes, setPaymentNotes] = useState<PaymentNote[]>([]); // Using explicit type if available or any
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'payments'>('received');

    // Totals
    const [historicDebt, setHistoricDebt] = useState(0);
    const [totalPayments, setTotalPayments] = useState(0);
    const [currentDebt, setCurrentDebt] = useState(0);

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const sellerData = await sellerService.getById(id);
            if (!sellerData) {
                toast.error('Vendedor no encontrado');
                navigate('/seller-balances');
                return;
            }
            setSeller(sellerData);

            // Load Exit Notes
            const allExitNotes = await exitNoteService.getBySeller(id);

            // Filter: Sent (Pending/In Transit) vs Received (Delivered/Received)
            const received = allExitNotes.filter(n => n.status === 'delivered' || n.status === 'received');
            const sent = allExitNotes.filter(n => n.status !== 'delivered' && n.status !== 'received');

            setReceivedExitNotes(received);
            setSentExitNotes(sent);

            // Load Payment Notes
            const allPayments = await paymentNoteService.getBySeller(id);
            const approvedPayments = allPayments.filter(p => p.status === 'approved');
            setPaymentNotes(approvedPayments as unknown as PaymentNote[]);

            // Calculations
            const debt = received.reduce((sum, n) => sum + n.totalPrice, 0);
            const payments = approvedPayments.reduce((sum, n) => sum + (n.totalAmount || 0), 0);

            setHistoricDebt(debt);
            setTotalPayments(payments);
            setCurrentDebt(debt - payments);

            setLoading(false);
        } catch (error) {
            console.error('Error loading details:', error);
            toast.error('Error al cargar detalles');
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDownloadPDF = () => {
        if (!seller) return;
        try {
            generateSellerBalancePDF(
                seller,
                receivedExitNotes,
                paymentNotes,
                historicDebt,
                totalPayments,
                currentDebt
            );
            toast.success('PDF descargado correctamente');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Error al generar PDF');
        }
    };



    const runShippingFixScript = async () => {
        if (!seller || !id) return;
        if (!window.confirm(`¿Estás seguro de agregar $28 de envío a las notas de ${seller.name} que no lo tengan?`)) return;

        try {
            setLoading(true);
            const notes = await exitNoteService.getBySeller(id);
            let updatedCount = 0;

            for (const note of notes) {
                const noteNumber = note.number || '';
                // Skip Bodega Ecuador notes
                if (noteNumber.toLowerCase().includes('ns-ecu') || noteNumber.toLowerCase().includes('nsw-ecu')) {
                    console.log(`Skipping Bodega Ecuador note: ${noteNumber}`);
                    continue;
                }

                const currentItems = note.items || [];
                const hasShipping = currentItems.some((item) =>
                    item.productId === 'shipping-fee-28' ||
                    (item.product && item.product.name === 'Costo de Envío')
                );

                if (hasShipping) {
                    continue;
                }

                // Add shipping item
                const shippingItem = {
                    id: `shipping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    productId: 'shipping-fee-28',
                    product: {
                        id: 'shipping-fee-28',
                        name: 'Costo de Envío',
                        sku: 'SHIPPING',
                        category: 'Servicio',
                        description: 'Costo de envío fijo',
                        cost: 0,
                        salePrice1: 28,
                        salePrice2: 28,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    quantity: 1,
                    unitPrice: 28,
                    totalPrice: 28,
                    weight: 0,
                };

                const newItems = [...currentItems, shippingItem] as any[];
                const newTotalPrice = (note.totalPrice || 0) + 28;

                await exitNoteService.update(note.id, {
                    items: newItems,
                    totalPrice: newTotalPrice
                });
                updatedCount++;
            }

            toast.success(`Se actualizaron ${updatedCount} notas con costo de envío`);
            loadData(); // Reload data
        } catch (error) {
            console.error('Error updating shipping costs:', error);
            toast.error('Error al actualizar costos de envío');
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;
    if (!seller) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/seller-balances')} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="h-6 w-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
                        <p className="text-gray-500">Detalle de Saldo y Movimientos</p>
                    </div>
                </div>
                <button
                    onClick={handleDownloadPDF}
                    className="btn-primary flex items-center"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Estado de Cuenta
                </button>
                {/* Temporary Script Button */}
                <button
                    onClick={runShippingFixScript}
                    className="btn-secondary flex items-center bg-gray-200 text-gray-800 hover:bg-gray-300 ml-2"
                    title="Agregar $28 de envío a notas sin costo"
                >
                    <DollarSign className="h-4 w-4 mr-2" />
                    +Envío ($28)
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-white border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Deuda Histórica Total</p>
                            <h3 className="text-2xl font-bold text-gray-900">${historicDebt.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full">
                            <Download className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Suma de notas de salida recibidas</p>
                </div>

                <div className="card bg-white border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pagos Realizados</p>
                            <h3 className="text-2xl font-bold text-gray-900">${totalPayments.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full">
                            <CreditCard className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Suma de notas de pago aprobadas</p>
                </div>

                <div className="card bg-white border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Deuda Actual</p>
                            <h3 className={`text-2xl font-bold ${currentDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${currentDebt.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-full">
                            <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Deuda Histórica - Pagos</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'received'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Notas Recibidas (Deuda)
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sent'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Notas Enviadas (En Tránsito)
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Pagos Realizados
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="card">
                {activeTab === 'received' && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Notas de Salida Recibidas</h3>
                        {receivedExitNotes.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No hay notas recibidas.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="table-header">Número</th>
                                            <th className="table-header">Fecha</th>
                                            <th className="table-header">Total</th>
                                            <th className="table-header">Items</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {receivedExitNotes.map((note) => (
                                            <tr key={note.id}>
                                                <td className="table-cell font-medium">{note.number}</td>
                                                <td className="table-cell">{new Date(note.date).toLocaleDateString()}</td>
                                                <td className="table-cell font-bold">${note.totalPrice.toLocaleString()}</td>
                                                <td className="table-cell">{note.items.length} items</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'sent' && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Notas de Salida Enviadas (No Recibidas)</h3>
                        {sentExitNotes.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No hay notas en tránsito.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="table-header">Número</th>
                                            <th className="table-header">Fecha</th>
                                            <th className="table-header">Estado</th>
                                            <th className="table-header">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sentExitNotes.map((note) => (
                                            <tr key={note.id}>
                                                <td className="table-cell font-medium">{note.number}</td>
                                                <td className="table-cell">{new Date(note.date).toLocaleDateString()}</td>
                                                <td className="table-cell">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        En tránsito
                                                    </span>
                                                </td>
                                                <td className="table-cell text-gray-500">${note.totalPrice.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Pagos Aprobados</h3>
                        {paymentNotes.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No hay pagos registrados.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="table-header">Fecha</th>
                                            <th className="table-header">Método</th>
                                            <th className="table-header">Referencia</th>
                                            <th className="table-header">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paymentNotes.map((note) => (
                                            <tr key={note.id}>
                                                <td className="table-cell">{new Date(note.paymentDate || note.createdAt).toLocaleDateString()}</td>
                                                <td className="table-cell capitalize">{note.paymentMethod}</td>
                                                <td className="table-cell text-gray-500">{note.reference || '-'}</td>
                                                <td className="table-cell font-bold text-green-600">${(note.totalAmount || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerBalanceDetails;
