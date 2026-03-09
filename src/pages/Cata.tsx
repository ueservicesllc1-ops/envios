import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Search, ShoppingCart, Send, Plus, Minus, Trash2, Check } from 'lucide-react';
import { InventoryItem, Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { exitNoteService } from '../services/exitNoteService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';
import { Capacitor } from '@capacitor/core';

interface CartItem {
    id: string;
    product: Product;
    quantity: number;
}

const Cata: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAnonymousAuth();

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            loadInventory();
        }
    }, [authLoading]);

    const loadInventory = async () => {
        try {
            setLoading(true);
            const [productsData, inventoryData, pendingNotes, transitNotes] = await Promise.all([
                productService.getAll(),
                inventoryService.getAll(),
                exitNoteService.getByStatus('pending'),
                exitNoteService.getByStatus('in-transit')
            ]);

            const exitNotesData = [...pendingNotes, ...transitNotes];

            // Calcular stock comprometido (pending/in-transit)
            const committedStock: Record<string, number> = {};
            exitNotesData.forEach(note => {
                if (!note || !note.items) return;
                const s = (note.status || '').toLowerCase();
                if (s === 'pending' || s === 'in-transit') {
                    note.items.forEach(item => {
                        if (item && item.productId) {
                            const pid = item.productId;
                            committedStock[pid] = (committedStock[pid] || 0) + (item.quantity || 0);
                        }
                    });
                }
            });

            const stockItems: InventoryItem[] = [];

            inventoryData.forEach(item => {
                if (!item || !item.productId) return;
                const location = (item.location || '').toLowerCase().trim();
                const isEcuador = location.includes('ecuador') || location === 'ecuador';

                if (isEcuador) {
                    const product = productsData.find(p => p.id === item.productId);

                    if (product) {
                        const status = (item.status || '').toLowerCase();
                        const isArrived = status !== 'in-transit' && status !== 'pending';

                        // Calcular stock real disponible restando COMPROMISOS
                        const committed = committedStock[product.id] || 0;
                        const realQuantity = Math.max(0, item.quantity - committed);

                        if (realQuantity > 0 && isArrived) {
                            stockItems.push({
                                ...item,
                                quantity: realQuantity,
                                product: product
                            });
                        }
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
            console.error('Error al cargar inventario:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: InventoryItem) => {
        const existing = cart.find(c => c.id === item.productId);
        if (existing) {
            if (existing.quantity >= item.quantity) {
                toast.error('No hay más stock disponible');
                return;
            }
            setCart(cart.map(c => c.id === item.productId ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { id: item.productId, product: item.product, quantity: 1 }]);
        }
        toast.success('Agregado a la lista');
    };

    const updateQuantity = (id: string, delta: number) => {
        const item = cart.find(c => c.id === id);
        const invItem = inventory.find(i => i.productId === id);

        if (!item || !invItem) return;

        const newQty = item.quantity + delta;
        if (newQty <= 0) {
            setCart(cart.filter(c => c.id !== id));
        } else if (newQty > invItem.quantity) {
            toast.error('No hay más stock disponible');
        } else {
            setCart(cart.map(c => c.id === id ? { ...c, quantity: newQty } : c));
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(c => c.id !== id));
    };

    const sendToWhatsApp = () => {
        if (cart.length === 0) {
            toast.error('La lista está vacía');
            return;
        }

        let message = '*Hola, me gustaría solicitar estos productos del catálogo:* \n\n';
        cart.forEach((item, index) => {
            const sizeInfo = item.product.size ? ` (Talla: ${item.product.size})` : '';
            message += `${index + 1}. *${item.product.name}*${sizeInfo} (Cant: ${item.quantity})\n`;
        });

        const total = cart.reduce((sum, item) => sum + (item.product.salePrice1 * item.quantity), 0);
        message += `\n*Total estimado: $${total.toFixed(2)}*`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/12017084725?text=${encodedMessage}`, '_blank');
    };

    const filteredItems = inventory.filter(item => {
        const name = item.product?.name || '';
        const sku = item.product?.sku || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sku.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium animate-pulse">Cargando catálogo...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Premium */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[100] border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/app')}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"
                        >

                            <ArrowLeft className="w-6 h-6" />
                        </button>

                        <div>
                            <h1 className="text-xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                                Catálogo Ecuador
                            </h1>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Bodega Babahoyo</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCart(true)}
                        className="relative p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all active:scale-95 group shadow-sm overflow-hidden"
                    >
                        <ShoppingCart className="w-6 h-6" />
                        {cart.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search Bar Premium */}
                <div className="px-4 pb-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar perfumes, cremas, etc..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-2xl text-sm font-medium transition-all outline-none"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-3 py-4 pb-32">
                {filteredItems.length === 0 ? (
                    <div className="mt-20 text-center px-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Package className="w-12 h-12 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">No se encontraron productos</h2>
                        <p className="text-gray-500 text-sm max-w-[240px] mx-auto">Prueba buscando con palabras clave diferentes o revisa más tarde.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filteredItems.map((item) => {
                            const inCart = cart.find(c => c.id === item.productId);
                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-100/50 overflow-hidden flex flex-col group active:scale-[0.98] transition-all"
                                >
                                    {/* Image Slot */}
                                    <div className="relative aspect-square bg-gray-50 overflow-hidden">
                                        {item.product.imageUrl ? (
                                            <img
                                                src={item.product.imageUrl}
                                                alt={item.product.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-10 h-10 text-gray-200" />
                                            </div>
                                        )}
                                        {/* Stock Badge */}
                                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-md ${item.quantity < 3 ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
                                            }`}>
                                            Stock: {item.quantity}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="p-3 flex flex-col flex-1">
                                        <div className="h-9 mb-1">
                                            <h3 className="text-[13px] font-bold text-gray-800 line-clamp-2 leading-tight">
                                                {item.product.name}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <p className="text-[10px] text-gray-400 font-medium">{item.product.sku}</p>
                                            {item.product.size && (
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                                    Talla: {item.product.size}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-auto flex items-center justify-between mb-3">
                                            <span className="text-lg font-black text-blue-600">${item.unitPrice.toFixed(2)}</span>
                                        </div>

                                        <button
                                            onClick={() => addToCart(item)}
                                            className={`w-full py-2.5 rounded-xl text-[13px] font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all ${inCart
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                                                }`}
                                        >
                                            <Plus className="w-4 h-4" />
                                            {inCart ? 'Agregar +' : 'Agregar lista'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Floating Send Button */}
            {cart.length > 0 && !showCart && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-in slide-in-from-bottom-8">
                    <button
                        onClick={sendToWhatsApp}
                        className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(37,211,102,0.3)] hover:scale-105 active:scale-95 transition-all"
                    >
                        <Send className="w-6 h-6" />
                        ENVIAR POR WHATSAPP ({cart.reduce((s, i) => s + i.quantity, 0)})
                    </button>
                </div>
            )}

            {/* Cart Modal / Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="bg-white w-full max-w-xl rounded-t-[32px] max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-[100px] duration-300"
                    >
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>

                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-xl font-black text-gray-800">Tu Lista</h2>
                                <p className="text-xs text-gray-500 font-bold">{cart.length} productos seleccionados</p>
                            </div>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <Trash2 className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold">Tu lista está vacía</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="bg-gray-50 p-3 rounded-2xl flex items-center gap-4 relative">
                                        <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shadow-sm flex-shrink-0">
                                            {item.product.imageUrl && (
                                                <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.product.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-blue-600 font-black">${item.product.salePrice1.toFixed(2)} c/u</p>
                                                {item.product.size && (
                                                    <span className="text-[10px] text-gray-400 font-bold">Talla: {item.product.size}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center bg-white rounded-xl border border-gray-100 shadow-sm px-1 py-1">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-black text-gray-800">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-1 rounded-full shadow-sm hover:bg-red-200 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 rounded-t-3xl">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-lg font-bold text-gray-600">Total Estimado</span>
                                <span className="text-3xl font-black text-blue-600">
                                    ${cart.reduce((s, i) => s + (i.product.salePrice1 * i.quantity), 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="flex-1 bg-white text-gray-600 py-4 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    Seguir viendo
                                </button>
                                <button
                                    onClick={sendToWhatsApp}
                                    className="flex-[2] bg-[#25D366] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Send className="w-5 h-5" />
                                    ENVIAR WP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cata;
