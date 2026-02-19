import React, { useState, useEffect } from 'react';
import { Truck, Search, Calendar, Package, ArrowRight, User, MapPin, RotateCcw } from 'lucide-react';
import { ExitNote, ExitNoteItem, Seller } from '../types';
import { exitNoteService } from '../services/exitNoteService';
import { sellerService } from '../services/sellerService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransferItem extends ExitNoteItem {
    exitNoteNumber: string;
    exitNoteDate: Date;
    sellerName: string;
    origin: string;
    noteId: string;
}

const TransferredProducts: React.FC = () => {
    const [transfers, setTransfers] = useState<TransferItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState('all');

    useEffect(() => {
        loadTransfers();
    }, []);

    const loadTransfers = async () => {
        try {
            setLoading(true);
            const [exitNotes, sellers] = await Promise.all([
                exitNoteService.getAll(),
                sellerService.getAll()
            ]);

            // Filter only transfer notes (NS-ECU or NS-USA)
            const transferNotes = exitNotes.filter(note =>
                (note.number.startsWith('NS-ECU-') || note.number.startsWith('NS-USA-')) &&
                note.status === 'delivered'
            );

            const allTransfers: TransferItem[] = [];

            transferNotes.forEach(note => {
                const origin = note.number.startsWith('NS-ECU') ? 'Bodega Ecuador' : 'Bodega USA';
                const sellerName = sellers.find(s => s.id === note.sellerId)?.name || note.seller || 'Desconocido';

                note.items.forEach(item => {
                    allTransfers.push({
                        ...item,
                        exitNoteNumber: note.number,
                        exitNoteDate: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
                        sellerName,
                        origin,
                        noteId: note.id // Add note ID here
                    });
                });
            });

            // Sort by date desc
            allTransfers.sort((a, b) => b.exitNoteDate.getTime() - a.exitNoteDate.getTime());

            setTransfers(allTransfers);
        } catch (error) {
            console.error('Error loading transfers:', error);
            toast.error('Error al cargar transferencias');
        } finally {
            setLoading(false);
        }
    };

    const handleRevertTransfer = async (noteId: string, itemDescription: string) => {
        if (!window.confirm(`¿Estás seguro de REVERTIR esta transferencia de ${itemDescription}? \n\nEsto devolverá el stock a la Bodega de origen y eliminará el registro del envío.`)) {
            return;
        }

        try {
            setLoading(true);
            await exitNoteService.delete(noteId);
            toast.success('Transferencia revertida exitosamente. El stock ha vuelto a la bodega.');
            loadTransfers(); // Recargar lista
        } catch (error) {
            console.error(error);
            toast.error('Error al revertir transferencia');
            setLoading(false);
        }
    };

    const filteredTransfers = transfers.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            item.product.name.toLowerCase().includes(searchLower) ||
            item.product.sku.toLowerCase().includes(searchLower) ||
            item.sellerName.toLowerCase().includes(searchLower) ||
            item.exitNoteNumber.toLowerCase().includes(searchLower);

        const matchesOrigin = selectedOrigin === 'all' || item.origin === selectedOrigin;

        let matchesDate = true;
        if (startDate && endDate) {
            const itemDate = new Date(item.exitNoteDate).setHours(0, 0, 0, 0);
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            matchesDate = itemDate >= start && itemDate <= end;
        }

        return matchesSearch && matchesOrigin && matchesDate;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Productos Transferidos</h1>
                    <p className="text-gray-600">Historial de transferencias de bodegas a vendedores</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                    <Truck className="w-8 h-8 text-blue-600" />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar producto, vendedor, nota..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <select
                            value={selectedOrigin}
                            onChange={(e) => setSelectedOrigin(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Todas las Bodegas</option>
                            <option value="Bodega USA">Bodega USA</option>
                            <option value="Bodega Ecuador">Bodega Ecuador</option>
                        </select>
                    </div>

                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino (Vendedor)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota #</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransfers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                        No se encontraron transferencias
                                    </td>
                                </tr>
                            ) : (
                                filteredTransfers.map((item, index) => (
                                    <tr key={`${item.exitNoteNumber}-${index}`} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{format(item.exitNoteDate, 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.origin === 'Bodega USA'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {item.origin}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0">
                                                    {item.product.imageUrl ? (
                                                        <img className="h-10 w-10 rounded-lg object-cover" src={item.product.imageUrl} alt="" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                                            <Package className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                                                    <div className="text-xs text-gray-500">{item.product.sku}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-900">{item.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2 text-sm text-gray-900">
                                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{item.sellerName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.exitNoteNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleRevertTransfer(item.noteId, item.product.name)}
                                                className="text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 p-2 rounded-lg transition-colors flex items-center justify-center ml-auto"
                                                title="Revertir Transferencia (Devolver a Bodega)"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>


                                ))
                            )}
                        </tbody>
                    </table>
                </div >
            </div >
        </div >
    );
};

export default TransferredProducts;
