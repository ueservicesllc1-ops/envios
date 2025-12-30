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
    Receipt,
    ChevronRight,
    Package
} from 'lucide-react';
import { Product, POSItem } from '../types';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { posService } from '../services/posService';
import { cashRegisterService } from '../services/cashRegisterService';
import { posCustomerService } from '../services/posCustomerService';
import { generatePOSReceipt } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface CartItem extends POSItem {
    availableStock: number;
}

const PointOfSale: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [barcodeInput, setBarcodeInput] = useState('');
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

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const productsData = await productService.getAll();

            // Filtrar solo productos con stock disponible
            const productsWithStock = await Promise.all(
                productsData.map(async (product) => {
                    const inventory = await inventoryService.getByProductIdAndLocation(
                        product.id,
                        'Bodega Principal'
                    );
                    return { product, stock: inventory?.quantity || 0 };
                })
            );

            const availableProducts = productsWithStock
                .filter(({ stock }) => stock > 0)
                .map(({ product }) => product);

            setProducts(availableProducts);
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    // Categorías únicas de productos
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return ['all', ...Array.from(cats)];
    }, [products]);

    // Filtrar productos
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.barcode && product.barcode.includes(searchTerm));
            const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    // Agregar al carrito
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
                id: `cart - ${Date.now()} -${product.id} `,
                productId: product.id,
                product,
                quantity: 1,
                unitPrice: product.salePrice1,
                discount: 0,
                totalPrice: product.salePrice1,
                availableStock: inventory.quantity
            };
            setCart([...cart, newItem]);
            toast.success(`${product.name} agregado al carrito`);
        }
    };

    // Actualizar cantidad
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

    // Actualizar precio unitario
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

    // Remover del carrito
    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    // Limpiar carrito
    const clearCart = () => {
        setCart([]);
        setCustomerInfo({ name: '', lastName: '', phone: '', email: '', address: '' });
        setSearchTerm('');
        toast.success('Carrito limpiado');
    };

    // Calcular totales
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = 0; // IVA 0% por ahora
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const total = subtotal + tax;

    // Calcular cambio
    const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;

    // Procesar venta
    const processPayment = async () => {
        if (cart.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        // Validar que nombre y apellido estén completos
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
                createdBy: 'Admin' // TODO: Obtener del usuario actual
            };

            const saleId = await posService.createSale(sale);

            // Registrar en caja si hay una abierta
            await cashRegisterService.addSaleToRegister(
                total,
                paymentMethod,
                paymentMethod === 'cash' || paymentMethod === 'mixed' ? cashReceived : undefined,
                paymentMethod === 'card' || paymentMethod === 'mixed' ? cardAmount : undefined,
                paymentMethod === 'transfer' || paymentMethod === 'mixed' ? transferAmount : undefined
            );

            // Actualizar historial de cliente
            // Buscar o crear cliente basado en el nombre completo
            let customer = customerInfo.phone
                ? await posCustomerService.searchByPhone(customerInfo.phone)
                : null;

            if (customer) {
                // Cliente existente - actualizar historial
                await posCustomerService.updatePurchaseHistory(customer.id, total);
            } else {
                // Cliente nuevo - crear registro
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

            // Generar y mostrar recibo PDF
            try {
                const completeSale = await posService.getSaleById(saleId);
                if (completeSale) {
                    generatePOSReceipt(completeSale);
                    toast.success('Recibo descargado');
                }
            } catch (pdfError) {
                console.error('Error al generar PDF:', pdfError);
                toast.error('Venta completada pero error al generar recibo');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error(error instanceof Error ? error.message : 'Error al procesar el pago');
        } finally {
            setProcessing(false);
        }
    };

    // Buscar producto por código de barras
    const searchByBarcode = async () => {
        if (!barcodeInput.trim()) return;

        const product = products.find(p => p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim());
        if (product) {
            await addToCart(product);
            setBarcodeInput('');
        } else {
            toast.error('Producto no encontrado');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                                <Receipt className="h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
                                <p className="text-white/80 text-sm">Sistema de Punto de Venta</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-white/80">Total en Carrito</p>
                                <p className="text-3xl font-bold">${total.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl">
                                <div className="flex items-center space-x-2">
                                    <ShoppingCart className="h-6 w-6" />
                                    <span className="text-2xl font-bold">{cart.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Products Section - Left */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {/* Search and Filters */}
                    <div className="mb-6 space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar productos por nombre, SKU o código de barras..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>

                        {/* Barcode Scanner */}
                        <div className="flex space-x-2">
                            <div className="relative flex-1">
                                <ScanLine className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Escanear código de barras"
                                    value={barcodeInput}
                                    onChange={(e) => setBarcodeInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && searchByBarcode()}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <button
                                onClick={searchByBarcode}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-105 active:scale-95"
                            >
                                <ScanLine className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Category Filters */}
                        <div className="flex space-x-2 overflow-x-auto pb-2">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={clsx(
                                        'px-6 py-2 rounded-full font-medium transition-all transform hover:scale-105 whitespace-nowrap',
                                        selectedCategory === category
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                                    )}
                                >
                                    {category === 'all' ? 'Todos' : category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Package className="h-24 w-24 mb-4" />
                                <p className="text-xl font-medium">No se encontraron productos</p>
                                <p className="text-sm">Intenta con otros términos de búsqueda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-6">
                                {filteredProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden border-2 border-transparent hover:border-indigo-400"
                                    >
                                        {/* Product Image */}
                                        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                />
                                            ) : (
                                                <Package className="h-16 w-16 text-gray-400" />
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-left group-hover:text-indigo-600 transition-colors">
                                                {product.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 mb-2 text-left">{product.sku}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-2xl font-bold text-indigo-600">
                                                    ${product.salePrice1.toLocaleString()}
                                                </span>
                                                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs font-medium">
                                                    Stock
                                                </div>
                                            </div>
                                        </div>

                                        {/* Add to Cart Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                                            <div className="bg-white text-indigo-600 px-4 py-2 rounded-full font-bold flex items-center space-x-2">
                                                <Plus className="h-5 w-5" />
                                                <span>Agregar</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart Section - Right */}
                <div className="w-[450px] bg-white shadow-2xl flex flex-col border-l-4 border-indigo-500">
                    {/* Cart Header */}
                    <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-6 border-b-2 border-indigo-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <ShoppingCart className="h-6 w-6 mr-3 text-indigo-600" />
                                Carrito ({cart.length})
                            </h2>
                            {cart.length > 0 && (
                                <button
                                    onClick={clearCart}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                                    title="Limpiar carrito"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <ShoppingCart className="h-20 w-20 mb-4" />
                                <p className="text-lg font-medium">Carrito vacío</p>
                                <p className="text-sm">Agrega productos para comenzar</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div
                                    key={item.id}
                                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-200 hover:border-indigo-300 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">{item.product.name}</h3>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-500">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                                                    className="w-20 text-sm p-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                                <span className="text-xs text-gray-400">c/u</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.productId)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center space-x-2 bg-white rounded-lg border-2 border-gray-300 p-1">
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-all active:scale-90"
                                            >
                                                <Minus className="h-4 w-4 text-gray-600" />
                                            </button>
                                            <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-all active:scale-90"
                                            >
                                                <Plus className="h-4 w-4 text-gray-600" />
                                            </button>
                                        </div>

                                        {/* Item Total */}
                                        <span className="text-xl font-bold text-indigo-600">
                                            ${item.totalPrice.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Footer with Totals and Checkout */}
                    {cart.length > 0 && (
                        <div className="border-t-4 border-indigo-200 p-6 space-y-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                            {/* Totals */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-gray-700">
                                    <span>Subtotal:</span>
                                    <span className="font-semibold">${subtotal.toLocaleString()}</span>
                                </div>
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Descuento:</span>
                                        <span className="font-semibold">-${totalDiscount.toLocaleString()}</span>
                                    </div>
                                )}
                                {tax > 0 && (
                                    <div className="flex justify-between text-gray-700">
                                        <span>IVA:</span>
                                        <span className="font-semibold">${tax.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t-2 border-indigo-300">
                                    <span>Total:</span>
                                    <span className="text-indigo-600">${total.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Checkout Button */}
                            <button
                                onClick={() => setShowCheckout(true)}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                            >
                                <CreditCard className="h-6 w-6" />
                                <span>Procesar Pago</span>
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-3xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold flex items-center">
                                    <CreditCard className="h-7 w-7 mr-3" />
                                    Procesar Pago
                                </h2>
                                <button
                                    onClick={() => setShowCheckout(false)}
                                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Customer Info */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-900 flex items-center">
                                    <User className="h-5 w-5 mr-2 text-indigo-600" />
                                    Información del Cliente
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nombre"
                                            value={customerInfo.name}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Apellido <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Apellido"
                                            value={customerInfo.lastName}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Teléfono (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Teléfono"
                                            value={customerInfo.phone}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email (opcional)
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={customerInfo.email}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Dirección (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Dirección"
                                            value={customerInfo.address}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-900">Método de Pago</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={clsx(
                                            'p-4 rounded-xl border-2 transition-all transform hover:scale-105',
                                            paymentMethod === 'cash'
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-300 hover:border-indigo-300'
                                        )}
                                    >
                                        <DollarSign className="h-8 w-8 mx-auto mb-2" />
                                        <p className="font-semibold">Efectivo</p>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={clsx(
                                            'p-4 rounded-xl border-2 transition-all transform hover:scale-105',
                                            paymentMethod === 'card'
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-300 hover:border-indigo-300'
                                        )}
                                    >
                                        <CreditCard className="h-8 w-8 mx-auto mb-2" />
                                        <p className="font-semibold">Tarjeta</p>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('transfer')}
                                        className={clsx(
                                            'p-4 rounded-xl border-2 transition-all transform hover:scale-105',
                                            paymentMethod === 'transfer'
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-300 hover:border-indigo-300'
                                        )}
                                    >
                                        <Phone className="h-8 w-8 mx-auto mb-2" />
                                        <p className="font-semibold">Transferencia</p>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('mixed')}
                                        className={clsx(
                                            'p-4 rounded-xl border-2 transition-all transform hover:scale-105',
                                            paymentMethod === 'mixed'
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-300 hover:border-indigo-300'
                                        )}
                                    >
                                        <Package className="h-8 w-8 mx-auto mb-2" />
                                        <p className="font-semibold">Mixto</p>
                                    </button>
                                </div>
                            </div>

                            {/* Payment Amount Inputs */}
                            {paymentMethod === 'cash' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto Recibido
                                        </label>
                                        <input
                                            type="number"
                                            value={cashReceived || ''}
                                            onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                                            className="input-field text-2xl font-bold"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    {cashReceived > 0 && (
                                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                                <span>Total a pagar:</span>
                                                <span className="font-semibold">${total.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xl font-bold text-green-600">
                                                <span>Cambio:</span>
                                                <span>${change.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'mixed' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto en Efectivo
                                        </label>
                                        <input
                                            type="number"
                                            value={cashReceived || ''}
                                            onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                                            className="input-field"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto con Tarjeta
                                        </label>
                                        <input
                                            type="number"
                                            value={cardAmount || ''}
                                            onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                                            className="input-field"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Monto por Transferencia
                                        </label>
                                        <input
                                            type="number"
                                            value={transferAmount || ''}
                                            onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                                            className="input-field"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                                        <div className="flex justify-between text-sm">
                                            <span>Total pagos:</span>
                                            <span className="font-semibold">
                                                ${(cashReceived + cardAmount + transferAmount).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Total a pagar:</span>
                                            <span className="font-semibold">${total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                                <h3 className="font-semibold text-lg mb-4 text-gray-900">Resumen de Venta</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Items:</span>
                                        <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)} unidades</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-semibold">${subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-indigo-600 pt-2 border-t-2 border-indigo-200">
                                        <span>Total:</span>
                                        <span>${total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setShowCheckout(false)}
                                    className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={processPayment}
                                    disabled={processing}
                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? 'Procesando...' : 'Confirmar Pago'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PointOfSale;
