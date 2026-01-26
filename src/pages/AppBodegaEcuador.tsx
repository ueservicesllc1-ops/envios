import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Search, Flag } from 'lucide-react';
import { InventoryItem, Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { exitNoteService } from '../services/exitNoteService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';

const AppBodegaEcuador: React.FC = () => {
    const navigate = useNavigate();

    // Autenticación anónima
    const { user, loading: authLoading, error: authError } = useAnonymousAuth();

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            loadInventory();
        }

        if (authError) {
            toast.error('Error de autenticación. Por favor, recarga la página.');
        }
    }, [authLoading, user, authError]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const [productsData, inventoryData, exitNotesData] = await Promise.all([
                productService.getAll(),
                inventoryService.getAll(),
                exitNoteService.getAll()
            ]);

            // Calcular stock comprometido (pending/in-transit)
            const committedStock: Record<string, number> = {};
            exitNotesData.forEach(note => {
                const s = (note.status || '').toLowerCase();
                if (s === 'pending' || s === 'in-transit') {
                    note.items.forEach(item => {
                        const pid = item.productId;
                        committedStock[pid] = (committedStock[pid] || 0) + (item.quantity || 0);
                    });
                }
            });

            const stockItems: InventoryItem[] = [];

            productsData.forEach(product => {
                // Buscar inventario asociado
                const item = inventoryData.find(i => i.productId === product.id);

                if (item) {
                    const location = (item.location || '').toLowerCase().trim();
                    const isEcuador = location.includes('ecuador') || location === 'ecuador';

                    // Solo mostrar si ya llegó (excluir in-transit y pending en el inventario físico)
                    const status = (item.status || '').toLowerCase();
                    const isArrived = status !== 'in-transit' && status !== 'pending';

                    // Calcular stock real disponible restando COMPROMISOS
                    const committed = committedStock[product.id] || 0;
                    const realQuantity = Math.max(0, item.quantity - committed);

                    // Mostrar si corresponde a Ecuador, ya llegó y tiene stock REAL > 0
                    if (realQuantity > 0 && isEcuador && isArrived) {
                        stockItems.push({
                            ...item,
                            quantity: realQuantity, // Mostrar stock REAL
                            product: product
                        });
                    }
                }
            });

            // Ordenar por nombre
            stockItems.sort((a, b) => {
                const nameA = a.product?.name || '';
                const nameB = b.product?.name || '';
                return nameA.localeCompare(nameB);
            });

            setInventory(stockItems);
        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Error al cargar inventario Ecuador');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = inventory.filter(item => {
        const name = item.product?.name || '';
        const sku = item.product?.sku || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sku.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Azul */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-50 shadow-lg px-4 py-4">
                <div className="flex items-center space-x-3 mb-4">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-xl font-bold">Bodega Ecuador</h1>
                            <Flag className="w-5 h-5 text-yellow-400" />
                        </div>
                        <p className="text-xs text-blue-100">
                            {filteredItems.length} productos disponibles
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-200" />
                    <input
                        type="text"
                        placeholder="Buscar producto o SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                </div>
            </div>

            {/* Grid de Productos */}
            <div className="p-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No hay productos en Bodega Ecuador</p>
                        <p className="text-xs text-gray-400 mt-2">(Los productos reservados o en tránsito no se muestran)</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col h-auto"
                            >
                                {/* Imagen */}
                                <div
                                    className="relative w-full pt-[100%] cursor-pointer group bg-gray-100"
                                    onClick={() => item.product.imageUrl && setSelectedImage(item.product.imageUrl)}
                                >
                                    <div className="absolute inset-0">
                                        {item.product.imageUrl ? (
                                            <img
                                                src={item.product.imageUrl}
                                                alt={item.product.name}
                                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Package className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Badge Stock */}
                                    <div className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10 ${item.quantity < 5 ? 'bg-red-500' : 'bg-green-600'
                                        }`}>
                                        Stock: {item.quantity}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-2 flex flex-col flex-1">
                                    <div className="h-10 mb-1">
                                        <h3 className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                                            {item.product.name}
                                        </h3>
                                    </div>
                                    <div className="mb-2">
                                        <p className="text-[10px] text-gray-500 truncate">
                                            {item.product.sku}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-2 border-t border-gray-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500">Precio</span>
                                            <span className="text-sm font-bold text-blue-600">
                                                ${item.unitPrice.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Zoom */}
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppBodegaEcuador;
