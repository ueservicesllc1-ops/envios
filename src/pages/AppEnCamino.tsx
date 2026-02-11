import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Clock, Truck, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExitNote } from '../types';
import { exitNoteService } from '../services/exitNoteService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';

const AppEnCamino: React.FC = () => {
    const navigate = useNavigate();

    // Autenticación anónima para acceso a Firestore
    const { user, loading: authLoading, error: authError } = useAnonymousAuth();

    const [exitNotes, setExitNotes] = useState<ExitNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in-transit' | 'received'>('all');

    useEffect(() => {
        // Solo cargar datos si la autenticación está completa
        if (!authLoading && user) {
            loadExitNotes();
        }

        if (authError) {
            toast.error('Error de autenticación. Por favor, recarga la página.');
        }
    }, [authLoading, user, authError]);

    const loadExitNotes = async () => {
        try {
            setLoading(true);
            const notes = await exitNoteService.getAll();

            // Filtrar solo pendientes, en tránsito y recibidos
            const filtered = notes.filter(note =>
                note.status === 'pending' || note.status === 'in-transit' || note.status === 'received'
            );

            // Ordenar por fecha (más recientes primero)
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setExitNotes(filtered);
        } catch (error) {
            console.error('Error loading exit notes:', error);
            toast.error('Error al cargar notas de salida');
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pendiente',
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    icon: Clock,
                    iconColor: 'text-yellow-600',
                    bgGradient: 'from-yellow-50 to-orange-50'
                };
            case 'in-transit':
                return {
                    label: 'En Camino',
                    color: 'bg-blue-100 text-blue-800 border-blue-300',
                    icon: Truck,
                    iconColor: 'text-blue-600',
                    bgGradient: 'from-blue-50 to-cyan-50'
                };
            case 'received':
                return {
                    label: 'Recibido',
                    color: 'bg-green-100 text-green-800 border-green-300',
                    icon: CheckCircle,
                    iconColor: 'text-green-600',
                    bgGradient: 'from-green-50 to-emerald-50'
                };
            default:
                return {
                    label: status,
                    color: 'bg-gray-100 text-gray-800 border-gray-300',
                    icon: Package,
                    iconColor: 'text-gray-600',
                    bgGradient: 'from-gray-50 to-gray-100'
                };
        }
    };

    const filteredNotes = exitNotes.filter(note => {
        const matchesSearch =
            note.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.customer.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === 'all' || note.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const pendingCount = exitNotes.filter(n => n.status === 'pending').length;
    const inTransitCount = exitNotes.filter(n => n.status === 'in-transit').length;
    const receivedCount = exitNotes.filter(n => n.status === 'received').length;

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando notas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-50 shadow-lg">
                <div className="px-4 py-4">
                    <div className="flex items-center space-x-3 mb-4">
                        <button
                            onClick={() => navigate('/app')}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold">En Camino</h1>
                            <p className="text-xs text-blue-100">Notas de salida</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-200" />
                        <input
                            type="text"
                            placeholder="Buscar por número, vendedor o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                    </div>
                </div>

                {/* Stats Pills */}
                <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`min-w-20 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${filterStatus === 'all'
                            ? 'bg-white text-blue-600'
                            : 'bg-white/20 text-white'
                            }`}
                    >
                        <div className="text-xs">Total</div>
                        <div className="text-lg font-bold">{exitNotes.length}</div>
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`min-w-20 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${filterStatus === 'pending'
                            ? 'bg-white text-blue-600'
                            : 'bg-white/20 text-white'
                            }`}
                    >
                        <div className="text-xs">Pendientes</div>
                        <div className="text-lg font-bold">{pendingCount}</div>
                    </button>
                    <button
                        onClick={() => setFilterStatus('in-transit')}
                        className={`min-w-20 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${filterStatus === 'in-transit'
                            ? 'bg-white text-blue-600'
                            : 'bg-white/20 text-white'
                            }`}
                    >
                        <div className="text-xs">Camino</div>
                        <div className="text-lg font-bold">{inTransitCount}</div>
                    </button>
                    <button
                        onClick={() => setFilterStatus('received')}
                        className={`min-w-20 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${filterStatus === 'received'
                            ? 'bg-white text-blue-600'
                            : 'bg-white/20 text-white'
                            }`}
                    >
                        <div className="text-xs">Recibidos</div>
                        <div className="text-lg font-bold">{receivedCount}</div>
                    </button>
                </div>
            </div>

            {/* Notes List */}
            <div className="px-4 py-4 space-y-2">
                {filteredNotes.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            No hay notas
                        </h3>
                        <p className="text-gray-500 text-sm">
                            {searchTerm
                                ? 'No se encontraron resultados para tu búsqueda'
                                : 'No hay notas con el estado seleccionado'}
                        </p>
                    </div>
                ) : (
                    filteredNotes.map((note, index) => {
                        const statusInfo = getStatusInfo(note.status);
                        const StatusIcon = statusInfo.icon;
                        const isEven = index % 2 === 0;

                        return (
                            <div
                                key={note.id}
                                onClick={() => navigate(`/app/en-camino/${note.id}`)}
                                className={`rounded-lg border-l-4 ${statusInfo.color.split(' ')[2].replace('border-', 'border-l-')} shadow-sm active:scale-98 transition-transform cursor-pointer ${isEven ? 'bg-white' : 'bg-blue-50'
                                    }`}
                            >
                                <div className="p-3">
                                    {/* Header compacto con número de orden */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                                                #{index + 1}
                                            </span>
                                            <span className="text-sm font-bold text-gray-800">{note.number}</span>
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                                                <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.iconColor}`} />
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(note.date).toLocaleDateString('es-EC', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>

                                    {/* Footer compacto */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                                            <Package className="h-3 w-3" />
                                            <span>{note.items.length} items</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-800">
                                            ${note.totalPrice.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Notas solo si existen y NO contienen info de Envío */}
                                    {note.notes && !note.notes.toLowerCase().includes('envío') && !note.notes.toLowerCase().includes('envio') && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <p className="text-xs text-gray-600 line-clamp-1" title={note.notes}>{note.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AppEnCamino;
