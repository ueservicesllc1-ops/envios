import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, DollarSign, ArrowRight } from 'lucide-react';
import { Seller } from '../types';
import { sellerService } from '../services/sellerService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { paymentNoteService } from '../services/paymentNoteService';
import { exitNoteService } from '../services/exitNoteService';
import toast from 'react-hot-toast';

interface SellerBalance extends Seller {
    historicDebt: number;
    totalPayments: number;
    currentDebt: number;
}

const SellerBalances: React.FC = () => {
    const navigate = useNavigate();
    const [sellers, setSellers] = useState<SellerBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadSellersAndBalances();
    }, []);

    const loadSellersAndBalances = async () => {
        try {
            setLoading(true);
            const sellersData = await sellerService.getAll();

            const balancesPromises = sellersData.map(async (seller) => {
                try {
                    // 1. Deuda Histórica: Total de Notas de Salida (Entregadas/Recibidas)
                    // Asumimos que la deuda se genera cuando se entrega la mercadería
                    const exitNotes = await exitNoteService.getBySeller(seller.id);
                    const historicDebt = exitNotes
                        .filter(note => note.status === 'delivered' || note.status === 'received') // Notas entregadas o recibidas suman a la deuda
                        .reduce((sum, note) => sum + note.totalPrice, 0);

                    // 2. Pagos Realizados: Total de Notas de Pago Aprobadas
                    const paymentNotes = await paymentNoteService.getBySeller(seller.id);
                    const totalPayments = paymentNotes
                        .filter(note => note.status === 'approved')
                        .reduce((sum, note) => sum + (note.totalAmount || 0), 0);

                    // 3. Deuda Actual
                    const currentDebt = historicDebt - totalPayments;

                    return {
                        ...seller,
                        historicDebt,
                        totalPayments,
                        currentDebt
                    };
                } catch (error) {
                    console.error(`Error calculating balance for ${seller.name}:`, error);
                    return {
                        ...seller,
                        historicDebt: 0,
                        totalPayments: 0,
                        currentDebt: 0
                    };
                }
            });

            const sellersWithBalances = await Promise.all(balancesPromises);
            setSellers(sellersWithBalances);
            setLoading(false);
        } catch (error) {
            console.error('Error loading seller balances:', error);
            toast.error('Error al cargar saldos de vendedores');
            setLoading(false);
        }
    };

    const filteredSellers = sellers.filter(seller =>
        seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Saldo Vendedores</h1>
                    <p className="text-gray-600">Gestión de deudas y pagos de vendedores</p>
                </div>
            </div>

            {/* Search */}
            <div className="card">
                <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar vendedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* Sellers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSellers.map((seller) => (
                    <div key={seller.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/seller-balances/${seller.id}`)}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span className="text-lg font-medium text-primary-600">
                                        {seller.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </span>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-lg font-semibold text-gray-900">{seller.name}</h3>
                                    <p className="text-sm text-gray-500">{seller.email}</p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                        </div>

                        <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Deuda Histórica</span>
                                <span className="text-sm font-medium text-gray-900">${seller.historicDebt.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Pagos Realizados</span>
                                <span className="text-sm font-medium text-green-600">-${seller.totalPayments.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <span className="text-base font-semibold text-gray-900">Deuda Actual</span>
                                <span className={`text-lg font-bold ${seller.currentDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${seller.currentDebt.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SellerBalances;
