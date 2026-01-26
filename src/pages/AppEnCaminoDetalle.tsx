import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, DollarSign } from 'lucide-react';
import { ExitNote } from '../types';
import { exitNoteService } from '../services/exitNoteService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';

const AppEnCaminoDetalle: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Autenticación anónima
    const { user, loading: authLoading, error: authError } = useAnonymousAuth();

    const [note, setNote] = useState<ExitNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const loadNote = async (noteId: string) => {
            try {
                setLoading(true);
                const data = await exitNoteService.getById(noteId);
                if (data) {
                    setNote(data);
                } else {
                    toast.error('Nota no encontrada');
                    navigate('/app/en-camino');
                }
            } catch (error) {
                console.error('Error loading note:', error);
                toast.error('Error al cargar la nota');
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && user && id) {
            loadNote(id);
        }

        if (authError) {
            toast.error('Error de autenticación');
        }
    }, [id, navigate, authLoading, user, authError]);

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!note) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-50 shadow-lg px-4 py-4">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold">{note.number}</h1>
                        <p className="text-xs text-blue-100">
                            {note.items.length} productos • ${note.totalPrice.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid de Productos (2 columnas) */}
            <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                    {note.items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col h-auto"
                        >
                            {/* Imagen del producto - Cuadrada y Clickeable (Padding Hack para cuadrado perfecto) */}
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

                                {/* Badge de cantidad */}
                                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10">
                                    x{item.quantity}
                                </div>
                            </div>

                            {/* Info del producto - Altura fija estricta */}
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
                                        <span className="text-[10px] text-gray-500">Unit.</span>
                                        <span className="text-xs font-bold text-gray-900">
                                            ${item.unitPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] text-gray-500">Total</span>
                                        <span className="text-sm font-bold text-blue-600">
                                            ${item.totalPrice.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Imagen */}
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

export default AppEnCaminoDetalle;
