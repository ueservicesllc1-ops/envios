import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Search, Tag } from 'lucide-react';
import { Product } from '../types';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';

const AppProductos: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await productService.getAll();

            // Ordenar alfabéticamente
            data.sort((a, b) => a.name.localeCompare(b.name));

            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Púrpura */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-50 shadow-lg px-4 py-4">
                <div className="flex items-center space-x-3 mb-4">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-xl font-bold">Catálogo de Productos</h1>
                            <Tag className="w-5 h-5 text-purple-200" />
                        </div>
                        <p className="text-xs text-purple-100">
                            {filteredProducts.length} productos registrados
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-200" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                </div>
            </div>

            {/* Grid de Productos */}
            <div className="p-4">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No se encontraron productos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col h-auto"
                            >
                                {/* Imagen */}
                                <div
                                    className="relative w-full pt-[100%] cursor-pointer group bg-gray-100"
                                    onClick={() => product.imageUrl && setSelectedImage(product.imageUrl)}
                                >
                                    <div className="absolute inset-0">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Package className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Badge Categoría */}
                                    {product.category && (
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full truncate block text-center">
                                                {product.category}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-2 flex flex-col flex-1">
                                    <div className="h-10 mb-1">
                                        <h3 className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                                            {product.name}
                                        </h3>
                                    </div>
                                    <div className="mb-2">
                                        <p className="text-[10px] text-gray-500 truncate">
                                            SKU: {product.sku}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-2 border-t border-gray-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500">Precio Venta</span>
                                            <span className="text-sm font-bold text-purple-600">
                                                ${product.salePrice1.toFixed(2)}
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

export default AppProductos;
