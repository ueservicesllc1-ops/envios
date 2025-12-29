import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    DollarSign,
    Phone,
    User,
    ScanLine,
    X,
    ChevronRight,
    Package
} from 'lucide-react';
import { Product, POSItem } from '../../types';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import { posService } from '../../services/posService';
import { cashRegisterService } from '../../services/cashRegisterService';
import { posCustomerService } from '../../services/posCustomerService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface CartItem extends POSItem {
    availableStock: number;
}

interface POSModalProps {
    onClose: () => void;
}

const POSModal: React.FC<POSModalProps> = ({ onClose }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        lastName: '',
        phone: '',
        email: '',
        address: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mixed'>('cash');
    const [cashReceived, setCashReceived] = useState<number>(0);
    const [cardAmount, setCardAmount] = useState<number>(0);
    const [transferAmount, setTransferAmount] = useState<number>(0);
    const [processing, setProcessing] = useState(false);
    const [productStock, setProductStock] = useState<Record<string, number>>({});

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const productsData = await productService.getAll();

            const productsWithStock = await Promise.all(
                productsData.map(async (product) => {
                    const inventory = await inventoryService.getByProductIdAndLocation(
                        product.id,
                        'Bodega Principal'
                    );
                    return { product, stock: inventory?.quantity || 0 };
                })
            );

            // Mapear productos con su stock, sin filtrar los que tienen 0
            const availableProducts = productsWithStock
                .map(({ product, stock }) => ({
                    ...product,
                    currentStock: stock // Añadir prop temporal o usar el mapa para render
                }));

            // Hack: Como Product type no tiene stock, actualiza productsData directamente si puedes, 
            // O mejor, deja el array original pero usa un map de stock.
            // Para simplificar sin cambiar tipos, guardaremos productsWithStock en estado o algo.
            // Pero POSModal usa 'products: Product[]'. 
            // Workaround: setProducts del array de productos BASE.
            // Y usaremos inventoryService al agregar al carrito para chequear real-time.
            // Pero para mostrar "Stock: X" en la lista... necesitamos esa info.

            // Revertimos a simple: mostrar TODOS. Stock check es on-click.
            // Pero si queremos mostrar el stock en la tarjeta...

            // Simplemente pasamos todos los productos encontrados.
            const allProducts = productsWithStock.map(({ product }) => product);
            setProducts(allProducts);

            // Mejor aun: guardar un mapa de stock.
            const stockMap = productsWithStock.reduce((acc, { product, stock }) => {
                acc[product.id] = stock;
                return acc;
            }, {} as Record<string, number>);
            setProductStock(stockMap);
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return ['all', ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (product.name || '').toLowerCase().includes(searchLower) ||
                (product.sku || '').toLowerCase().includes(searchLower) ||
                (product.barcode && product.barcode.includes(searchTerm));
            const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    const addToCart = async (product: Product) => {
        const inventory = await inventoryService.getByProductIdAndLocation(
            product.id,
            'Bodega Principal'
        );

        if (!inventory || inventory.quantity <= 0) {
            toast.error('Producto sin stock disponible');
            return;
        }

        const existingItem = cart.find(item => item.productId === product.id);

        if (existingItem) {
            if (existingItem.quantity >= inventory.quantity) {
                toast.error('No hay más stock disponible');
                return;
            }
            updateQuantity(product.id, existingItem.quantity + 1);
        } else {
            const newItem: CartItem = {
                id: `cart-${Date.now()}-${product.id}`,
                productId: product.id,
                product,
                quantity: 1,
                unitPrice: product.salePrice1,
                discount: 0,
                totalPrice: product.salePrice1,
                availableStock: inventory.quantity
            };
            setCart([...cart, newItem]);
            toast.success(`${product.name} agregado`);
        }
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(cart.map(item => {
            if (item.productId === productId) {
                if (newQuantity > item.availableStock) {
                    toast.error('Cantidad excede el stock disponible');
                    return item;
                }
                return {
                    ...item,
                    quantity: newQuantity,
                    totalPrice: (item.unitPrice * newQuantity) - item.discount
                };
            }
            return item;
        }));
    };

    const updatePrice = (productId: string, newPrice: number) => {
        if (newPrice < 0) return;

        setCart(cart.map(item => {
            if (item.productId === productId) {
                return {
                    ...item,
                    unitPrice: newPrice,
                    totalPrice: (newPrice * item.quantity) - item.discount
                };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setCustomerInfo({ name: '', lastName: '', phone: '', email: '', address: '' });
        setSearchTerm('');
    };

    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = 0;
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal + tax;
    const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;

    const processPayment = async () => {
        if (cart.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        if (!customerInfo.name.trim() || !customerInfo.lastName.trim()) {
            toast.error('Por favor ingresa nombre y apellido del cliente');
            return;
        }

        if (paymentMethod === 'cash' && cashReceived < total) {
            toast.error('Monto recibido insuficiente');
            return;
        }

        if (paymentMethod === 'mixed') {
            const totalPaid = cardAmount + cashReceived + transferAmount;
            if (Math.abs(totalPaid - total) > 0.01) {
                toast.error('El monto total no coincide con el total de la venta');
                return;
            }
        }

        try {
            setProcessing(true);

            const sale = {
                date: new Date(),
                customerName: `${customerInfo.name} ${customerInfo.lastName}`.trim(),
                customerPhone: customerInfo.phone,
                customerEmail: customerInfo.email,
                customerAddress: customerInfo.address,
                items: cart.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    product: item.product,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    totalPrice: item.totalPrice
                })),
                subtotal,
                tax,
                discount: totalDiscount,
                total,
                paymentMethod,
                cashReceived: paymentMethod === 'cash' || paymentMethod === 'mixed' ? cashReceived : undefined,
                change: paymentMethod === 'cash' ? change : undefined,
                cardAmount: paymentMethod === 'card' || paymentMethod === 'mixed' ? (paymentMethod === 'card' ? total : cardAmount) : undefined,
                transferAmount: paymentMethod === 'transfer' || paymentMethod === 'mixed' ? (paymentMethod === 'transfer' ? total : transferAmount) : undefined,
                status: 'completed' as const,
                createdBy: 'Admin'
            };

            await posService.createSale(sale);

            await cashRegisterService.addSaleToRegister(
                total,
                paymentMethod,
                paymentMethod === 'cash' || paymentMethod === 'mixed' ? cashReceived : undefined,
                paymentMethod === 'card' || paymentMethod === 'mixed' ? cardAmount : undefined,
                paymentMethod === 'transfer' || paymentMethod === 'mixed' ? transferAmount : undefined
            );

            let customer = customerInfo.phone
                ? await posCustomerService.searchByPhone(customerInfo.phone)
                : null;

            if (customer) {
                await posCustomerService.updatePurchaseHistory(customer.id, total);
            } else {
                await posCustomerService.create({
                    name: `${customerInfo.name} ${customerInfo.lastName}`.trim(),
                    phone: customerInfo.phone || undefined,
                    email: customerInfo.email || undefined,
                    address: customerInfo.address || undefined,
                    totalPurchases: total,
                    lastPurchaseDate: new Date(),
                    isActive: true
                });
            }

            toast.success('Venta procesada exitosamente');
            setShowCheckout(false);
            clearCart();
            setCashReceived(0);
            setCardAmount(0);
            setTransferAmount(0);
            onClose();
        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error(error instanceof Error ? error.message : 'Error al procesar el pago');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
                {/* Compact Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Punto de Venta</h2>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm opacity-80">Total</p>
                            <p className="text-2xl font-bold">${total.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/20 px-3 py-2 rounded-lg">
                            <ShoppingCart className="h-5 w-5 inline mr-2" />
                            <span className="font-bold">{cart.length}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="hover:bg-white/20 p-2 rounded-lg transition-all"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Products Section */}
                    <div className="flex-1 flex flex-col p-4 overflow-hidden">
                        {/* Compact Search */}
                        <div className="mb-4 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar productos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* Compact Categories */}
                            <div className="flex space-x-2 overflow-x-auto pb-1">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={clsx(
                                            'px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                                            selectedCategory === category
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        )}
                                    >
                                        {category === 'all' ? 'Todos' : category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Compact Products Grid */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Package className="h-16 w-16 mb-2" />
                                    <p className="text-sm">No se encontraron productos</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 pb-4">
                                    {filteredProducts.map(product => {
                                        const currentStock = productStock[product.id] || 0;
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => addToCart(product)}
                                                disabled={currentStock <= 0}
                                                className={clsx(
                                                    "group bg-white rounded-xl shadow transition-all transform overflow-hidden border border-gray-200 h-full flex flex-col",
                                                    currentStock > 0 ? "hover:shadow-lg hover:scale-105 active:scale-95 hover:border-indigo-400" : "opacity-60 cursor-not-allowed grayscale"
                                                )}
                                            >
                                                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden w-full relative">
                                                    {currentStock <= 0 && (
                                                        <div className="absolute inset-0 bg-black/10 z-10 flex items-center justify-center">
                                                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded transform -rotate-12">AGOTADO</span>
                                                        </div>
                                                    )}
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                        />
                                                    ) : (
                                                        <Package className="h-8 w-8 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="p-3 flex-1 flex flex-col justify-between w-full">
                                                    <h3 className="font-semibold text-xs text-gray-900 mb-2 line-clamp-2 text-left leading-snug">
                                                        {product.name}
                                                    </h3>
                                                    <div className="flex justify-between items-end border-t pt-2 border-gray-100 w-full">
                                                        <p className="text-sm font-bold text-indigo-600">${product.salePrice1}</p>
                                                        <span className={clsx(
                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                                            currentStock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                        )}>
                                                            {currentStock} unds
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compact Cart */}
                    <div className="w-80 bg-gray-50 flex flex-col border-l border-gray-200">
                        <div className="p-4 border-b border-gray-200 bg-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">Carrito ({cart.length})</h3>
                                {cart.length > 0 && (
                                    <button
                                        onClick={clearCart}
                                        className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <ShoppingCart className="h-12 w-12 mb-2" />
                                    <p className="text-sm">Carrito vacío</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div
                                        key={item.id}
                                        className="bg-white rounded-lg p-3 border border-gray-200"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 pr-2">
                                                <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{item.product.name}</h4>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-gray-500">$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                                                        className="w-16 text-xs p-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                    <span className="text-[10px] text-gray-400">c/u</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.productId)}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                                                <button
                                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                    className="p-1 hover:bg-white rounded transition-all"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                    className="p-1 hover:bg-white rounded transition-all"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600">
                                                ${item.totalPrice.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="border-t border-gray-200 p-4 bg-white space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal:</span>
                                        <span className="font-semibold">${subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                                        <span>Total:</span>
                                        <span className="text-indigo-600">${total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowCheckout(true)}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
                                >
                                    <CreditCard className="h-5 w-5" />
                                    <span>Procesar Pago</span>
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Checkout Modal */}
                {showCheckout && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-10">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
                                <h3 className="text-xl font-bold">Procesar Pago</h3>
                                <button
                                    onClick={() => setShowCheckout(false)}
                                    className="hover:bg-white/20 p-2 rounded-lg transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Customer Info */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-900 flex items-center">
                                        <User className="h-4 w-4 mr-2 text-indigo-600" />
                                        Información del Cliente
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Nombre <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nombre"
                                                value={customerInfo.name}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                                className="input-field text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Apellido <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Apellido"
                                                value={customerInfo.lastName}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                                                className="input-field text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Teléfono (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Teléfono"
                                                value={customerInfo.phone}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                                className="input-field text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Email (opcional)
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                value={customerInfo.email}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                                className="input-field text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-900">Método de Pago</h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { value: 'cash', label: 'Efectivo', Icon: DollarSign },
                                            { value: 'card', label: 'Tarjeta', Icon: CreditCard },
                                            { value: 'transfer', label: 'Transferencia', Icon: Phone },
                                            { value: 'mixed', label: 'Mixto', Icon: Package }
                                        ].map(({ value, label, Icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => setPaymentMethod(value as any)}
                                                className={clsx(
                                                    'p-3 rounded-lg border-2 transition-all text-sm',
                                                    paymentMethod === value
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                        : 'border-gray-300 hover:border-indigo-300'
                                                )}
                                            >
                                                <Icon className="h-5 w-5 mx-auto mb-1" />
                                                <p className="font-semibold text-xs">{label}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Inputs */}
                                {paymentMethod === 'cash' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto Recibido
                                        </label>
                                        <input
                                            type="number"
                                            value={cashReceived || ''}
                                            onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                                            className="input-field text-xl font-bold"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                        {cashReceived > 0 && (
                                            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                                <div className="flex justify-between text-sm">
                                                    <span>Total:</span>
                                                    <span className="font-semibold">${total.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold text-green-600">
                                                    <span>Cambio:</span>
                                                    <span>${change.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex space-x-3 pt-3">
                                    <button
                                        onClick={() => setShowCheckout(false)}
                                        className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={processPayment}
                                        disabled={processing}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                                    >
                                        {processing ? 'Procesando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default POSModal;
