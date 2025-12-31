import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, CreditCard, ShoppingCart, User, X, Check, Upload, CheckCircle, Menu, Package, LayoutDashboard, LogOut, Wallet, Truck, Search, ChevronDown } from 'lucide-react';
import { PayPalButtons } from "@paypal/react-paypal-js";
import Footer from '../components/Layout/Footer';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { getImageUrl } from '../utils/imageUtils';
import toast from 'react-hot-toast';
import { onlineSaleService } from '../services/onlineSaleService';
import { inventoryService } from '../services/inventoryService';
import { sellerService } from '../services/sellerService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import CouponSelector from '../components/CouponSelector';
import { Coupon } from '../services/couponService';

const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { user, isAdmin } = useAuth();

    // Header states
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0); // Placeholder si no se implementa lógica completa

    // Verificar si el usuario es vendedor real
    useEffect(() => {
        const checkSellerStatus = async () => {
            if (user && user.email) {
                if (isAdmin) {
                    setIsVerifiedSeller(true);
                    return;
                }
                try {
                    const sellers = await sellerService.getAll();
                    const sellerExists = sellers.some(seller => seller.email === user.email);
                    setIsVerifiedSeller(sellerExists);
                } catch (error) {
                    console.error('Error verificando vendedor:', error);
                    setIsVerifiedSeller(false);
                }
            } else {
                setIsVerifiedSeller(false);
            }
        };
        checkSellerStatus();
    }, [user, isAdmin]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success(t('auth.logoutSuccess'));
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            toast.error(t('auth.logoutError'));
        }
    };

    const {
        cart, updateCartQuantity, removeFromCart, clearCart,
        cartTotal, perfumeSubtotal, productSubtotal,
        couponCode, setCouponCode, couponDiscount, setCouponDiscount,
        couponActive, enteredCouponCode: contextEnteredCoupon,
        setCouponActive, appliedCoupon, setAppliedCoupon,
        activeCouponId, setActiveCouponId,
        couponDiscountAmount,
        shippingCost, shippingWeight, totalWithShipping
    } = useCart();

    const [enteredCouponCode, setEnteredCouponCode] = useState('');
    const [showCheckoutForm, setShowCheckoutForm] = useState(false);
    const [processingSale, setProcessingSale] = useState(false);

    // Estado para el formulario de checkout
    const [customerInfo, setCustomerInfo] = useState({
        name: user?.displayName?.split(' ')[0] || '',
        lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        phone: '',
        address: ''
    });

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'banco_pichincha' | 'paypal' | null>(null);
    const [showBankDetails, setShowBankDetails] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [rewardCoupon, setRewardCoupon] = useState<Coupon | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleApplyCoupon = async () => {
        if (!enteredCouponCode.trim()) return;

        try {
            const { couponService } = await import('../services/couponService');
            const coupon = await couponService.getCouponByCode(enteredCouponCode.trim());

            if (!coupon) {
                toast.error('Cupón inválido o expirado');
                return;
            }

            // Validar mínimo de compra (usando subtotales sin envío)
            const subtotal = productSubtotal + perfumeSubtotal;
            if (subtotal < coupon.minPurchase) {
                toast.error(`La compra mínima para este cupón es $${coupon.minPurchase}`);
                return;
            }

            // Aplicar cupón
            setCouponActive(true);
            setAppliedCoupon(true);
            setCouponCode(coupon.code);
            setCouponDiscount(coupon.amount); // Monto fijo
            setActiveCouponId(coupon.id);

            toast.success(`Cupón de $${coupon.amount} aplicado correctamente`);
        } catch (error) {
            console.error(error);
            toast.error('Error al validar el cupón');
        }
    };

    const validateCartStock = async () => {
        for (const item of cart) {
            if (item.type === 'product' && item.product) {
                // Buscar stock globalmente por producto 
                const inventory = await inventoryService.getByProductId(item.product.id);
                if (!inventory || inventory.quantity < item.quantity) {
                    return {
                        valid: false,
                        message: `Stock insuficiente para ${item.product?.name || 'producto'}. Disponible: ${inventory?.quantity || 0}`
                    };
                }
            }
        }
        return { valid: true };
    };

    const handleCheckout = async (paypalTransactionId?: string) => {
        if (!user) {
            toast.error(t('auth.loginRequired'));
            navigate('/login');
            return;
        }

        const currentSubtotal = productSubtotal + perfumeSubtotal;

        if (currentSubtotal === 0) {
            toast.error(t('cart.empty'));
            return;
        }

        // Validar información del cliente
        if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
            toast.error('Por favor complete todos los datos de envío');
            setShowCheckoutForm(true);
            return;
        }

        // Si es transferencia y no hay recibo
        if (selectedPaymentMethod === 'banco_pichincha' && !receiptFile) {
            toast.error('Por favor suba el comprobante de depósito');
            return;
        }

        // Validar stock antes de procesar cualquier cosa
        const stockCheck = await validateCartStock();
        if (!stockCheck.valid) {
            toast.error(stockCheck.message!);
            return;
        }

        setProcessingSale(true);
        setUploadingReceipt(true);

        try {
            let receiptUrl = '';

            // Subir recibo si existe
            if (receiptFile) {
                const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${receiptFile.name}`);
                await uploadBytes(storageRef, receiptFile);
                receiptUrl = await getDownloadURL(storageRef);
            }

            const saleItems: any[] = cart.map(item => {
                const product = item.product;
                const perfume = item.perfume;

                if (product) {
                    return {
                        productId: product.id,
                        quantity: item.quantity,
                        unitPrice: product.salePrice2 || product.salePrice1,
                        subtotal: (product.salePrice2 || product.salePrice1) * item.quantity,
                        name: product.name,
                        image: product.imageUrl,
                        type: 'product'
                    };
                } else if (perfume) {
                    return {
                        productId: perfume.id,
                        quantity: item.quantity,
                        unitPrice: perfume.price,
                        subtotal: perfume.price * item.quantity,
                        name: `${perfume.brand} - ${perfume.name}`,
                        image: perfume.imageUrl,
                        type: 'perfume'
                    };
                }
                return null;
            }).filter(Boolean) as any[];

            const saleNumber = `VENTA-${Date.now()}`;
            // totalWithShipping ya incluye el descuento del cupón aplicado en el Provider
            const finalTotal = Math.max(0, totalWithShipping);

            // Determinar estado basado en método de pago
            let saleStatus: 'pending' | 'confirmed' | 'cancelled' = 'pending';
            if (selectedPaymentMethod === 'banco_pichincha') {
                saleStatus = 'pending';
            } else if (selectedPaymentMethod === 'paypal' && paypalTransactionId) {
                saleStatus = 'confirmed'; // Pago confirmado por PayPal
            } else {
                saleStatus = 'confirmed'; // Otros métodos
            }

            await onlineSaleService.create({
                number: saleNumber,
                items: saleItems,
                totalAmount: finalTotal,
                shippingCost,
                shippingWeight,
                customerName: `${customerInfo.name} ${customerInfo.lastName}`,
                customerEmail: customerInfo.email,
                customerPhone: customerInfo.phone,
                customerAddress: customerInfo.address,
                status: saleStatus,
                paymentMethod: selectedPaymentMethod || 'banco_pichincha',
                paypalTransactionId: paypalTransactionId,
                receiptUrl,
                notes: appliedCoupon && couponCode
                    ? `Venta desde Tienda Online - Cupón aplicado: ${couponCode} (-$${couponDiscountAmount})`
                    : 'Venta desde Tienda Online',
                createdAt: new Date()
            });

            // Marcar cupón como usado
            // Marcar cupón como usado
            if (activeCouponId) {
                const { couponService } = await import('../services/couponService');
                await couponService.useCoupon(activeCouponId, saleNumber);
                // Limpiar cupón del estado global
                setAppliedCoupon(false);
                setCouponActive(false);
                setCouponDiscount(0);
                setCouponCode('');
                setActiveCouponId(null);
            }

            // ÉXITO
            clearCart();
            // Redirigir a página de éxito
            navigate('/order-success', { state: { orderNumber: saleNumber } });

        } catch (error: any) {
            console.error(error);
            // Si el error es de stock (lanzado por onlineSaleService si falla en concurrencia), mostrarlo
            if (error.message && error.message.includes('Stock insuficiente')) {
                toast.error('Lo sentimos, uno o más productos ya no tienen stock suficiente.');
            } else {
                toast.error('Error al procesar el pedido');
            }
        } finally {
            setProcessingSale(false);
            setUploadingReceipt(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <ShoppingCart className="h-24 w-24 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('home.cartEmpty')}</h2>
                <p className="text-gray-500 mb-8">{t('home.addToCart')}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-blue-900 text-white rounded-lg font-bold hover:bg-blue-800 transition-colors"
                >
                    Volver a la Tienda
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header Estilo Envíos Ecuador */}
            <header className="sticky top-0 z-40 bg-white shadow-md mb-6">
                <div className="bg-blue-900 text-white">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between gap-4">

                            {/* Mobile Header: Menu + Compact Logo + Cart */}
                            <div className="md:hidden flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setShowMobileMenu(true)} className="text-white p-1">
                                        <Menu className="h-6 w-6" />
                                    </button>
                                    <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                                        <img src="/logo-compras-express.png" alt="Compras Express" className="h-8 object-contain bg-white rounded px-1" />
                                        <span className="text-[9px] text-yellow-400 font-medium tracking-wide mt-1">USA - Ecuador</span>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/cart')} className="relative p-1 text-white">
                                    <ShoppingCart className="h-6 w-6" />
                                    {cart.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-blue-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                            {cart.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Desktop Logo */}
                            <div className="hidden md:flex items-center gap-4">
                                <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                                    <div className="flex items-center gap-2">
                                        <img src="/logo-compras-express.png" alt="Compras Express" className="h-10 object-contain bg-white rounded px-2 py-1" />
                                    </div>
                                    <span className="text-[10px] text-yellow-400 leading-none tracking-wide mt-1">Compra en USA y recíbelo en Ecuador</span>
                                </div>
                            </div>

                            {/* SearchBar (Desktop Only) */}
                            <div className="hidden md:flex flex-1 max-w-3xl mx-4">
                                <div className="flex w-full bg-white rounded-md overflow-hidden shadow-sm h-10">
                                    <input
                                        type="text"
                                        placeholder="Buscar productos..."
                                        className="flex-1 px-4 text-sm text-gray-700 focus:outline-none"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <button
                                        className="px-5 text-gray-500 hover:text-blue-900"
                                        onClick={() => navigate(`/?search=${searchTerm}`)}
                                    >
                                        <Search className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* User Menu (Desktop Only) */}
                            <div className="hidden md:flex items-center gap-6 text-white text-sm font-medium">
                                {user ? (
                                    <div className="relative group cursor-pointer flex items-center gap-1">
                                        <div className="flex flex-col items-end leading-tight">
                                            <span className="text-[11px] font-normal opacity-90">Hola, {user.displayName?.split(' ')[0] || 'Usuario'}</span>
                                            <span className="flex items-center gap-1 font-bold">Mi cuenta <ChevronDown className="h-3 w-3" /></span>
                                        </div>
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded shadow-xl py-2 text-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                                <p className="font-bold truncate">{user.email}</p>
                                            </div>
                                            <button onClick={() => navigate('/my-orders')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                                                <Package className="h-4 w-4" /> Mis pedidos
                                            </button>
                                            {(isVerifiedSeller || isAdmin) && (
                                                <button
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                                                    onClick={() => navigate('/dashboard')}
                                                >
                                                    <LayoutDashboard className="h-4 w-4 text-yellow-600" /> Panel Vendedor
                                                </button>
                                            )}
                                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center gap-2">
                                                <LogOut className="h-4 w-4" /> Cerrar sesión
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => navigate('/login')} className="flex items-center gap-2 hover:underline">
                                        <User className="h-5 w-5" /> Login
                                    </button>
                                )}

                                {/* Desktop Cart Button */}
                                <button
                                    className="flex items-center gap-1 relative group"
                                    onClick={() => navigate('/cart')}
                                >
                                    <ShoppingCart className="h-6 w-6" />
                                    {cart.length > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                            {cart.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title Bar for Cart */}
                <div className="bg-gray-100 border-b border-gray-200 py-2 md:py-3">
                    <div className="container mx-auto px-4 flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-base md:text-lg font-bold text-gray-800">Tu Carrito ({cart.length} items)</h1>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Lista de Items */}
                    <div className="flex-1 space-y-4">
                        {!showCheckoutForm ? (
                            <>
                                {cart.map((item, index) => {
                                    const displayItem = item.product || item.perfume;
                                    if (!displayItem) return null;
                                    const price = item.product
                                        ? (item.product.salePrice2 || item.product.salePrice1)
                                        : item.perfume?.price || 0;

                                    return (
                                        <div key={index} className="bg-white p-4 rounded-xl shadow-sm flex gap-4">
                                            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {displayItem.imageUrl ? (
                                                    <img src={getImageUrl(displayItem.imageUrl)} className="w-full h-full object-contain" alt={displayItem.name} />
                                                ) : <Package className="text-gray-400" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{displayItem.name}</h3>
                                                        <p className="text-sm text-gray-500">{item.type === 'product' ? 'Producto' : 'Perfume'}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(item.product?.id || item.perfume?.id || '', item.type)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>

                                                <div className="flex justify-between items-end mt-4">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => updateCartQuantity(item.product?.id || item.perfume?.id || '', item.quantity - 1, item.type)}
                                                            className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 font-bold"
                                                        >
                                                            -
                                                        </button>
                                                        <span>{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateCartQuantity(item.product?.id || item.perfume?.id || '', item.quantity + 1, item.type)}
                                                            className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 font-bold"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <p className="font-bold text-lg">${(price * item.quantity).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            /* Formulario de Checkout */
                            <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                                <h2 className="text-xl font-bold mb-4">Información de Envío</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            value={customerInfo.name}
                                            onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                            className="w-full border rounded-lg p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Apellido</label>
                                        <input
                                            type="text"
                                            value={customerInfo.lastName}
                                            onChange={e => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                                            className="w-full border rounded-lg p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={customerInfo.phone}
                                            onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                            className="w-full border rounded-lg p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={customerInfo.email}
                                            onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                            className="w-full border rounded-lg p-2"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Dirección Completa</label>
                                        <textarea
                                            value={customerInfo.address}
                                            onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                            className="w-full border rounded-lg p-2"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold mt-8 mb-4">Método de Pago</h2>
                                <div className="space-y-3">
                                    <div
                                        onClick={() => { setSelectedPaymentMethod('banco_pichincha'); setShowBankDetails(true); }}
                                        className={`p-4 border rounded-lg cursor-pointer flex items-center justify-between ${selectedPaymentMethod === 'banco_pichincha' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="text-yellow-600" />
                                            <span className="font-medium">Transferencia / Depósito (Banco Pichincha)</span>
                                        </div>
                                        {selectedPaymentMethod === 'banco_pichincha' && <CheckCircle className="text-blue-500" />}
                                    </div>

                                    {showBankDetails && selectedPaymentMethod === 'banco_pichincha' && (
                                        <div className="bg-yellow-50 p-4 rounded-lg text-sm space-y-2 ml-4 mb-4 border border-yellow-200">
                                            <p><strong>Banco:</strong> Pichincha</p>
                                            <p><strong>Cuenta:</strong> Ahorro Transaccional</p>
                                            <p><strong>Número:</strong> 2204259085</p>
                                            <p><strong>A nombre de:</strong> Luis Uchubanda Falconi</p>
                                            <div className="mt-3">
                                                <label className="block font-medium mb-1">Subir Comprobante</label>
                                                <input type="file" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        onClick={() => { setSelectedPaymentMethod('paypal'); setShowBankDetails(false); }}
                                        className={`p-4 border rounded-lg cursor-pointer flex items-center justify-between ${selectedPaymentMethod === 'paypal' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="text-blue-600" />
                                            <span className="font-medium">PayPal / Tarjeta de Crédito</span>
                                        </div>
                                        {selectedPaymentMethod === 'paypal' && <CheckCircle className="text-blue-500" />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumen de Orden */}
                    <div className="w-full lg:w-96">
                        <div className="bg-white p-6 rounded-xl shadow-sm sticky top-24">
                            <h2 className="text-lg font-bold mb-4">Resumen del Pedido</h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium">${(productSubtotal + perfumeSubtotal).toFixed(2)}</span>
                                </div>

                                {couponDiscountAmount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Descuento Cupón</span>
                                        <span className="font-medium">-${couponDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-gray-600">
                                    <span>Peso Estimado</span>
                                    <span>{shippingWeight} lb (Aprox.)</span>
                                </div>
                                <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mb-2 border border-yellow-200">
                                    <span className="font-bold">Nota:</span> El peso mostrado es un estimado. El costo final de envío se calculará con el peso real al empacar su pedido. Cualquier diferencia se ajustará en su cuenta.
                                </div>

                                <div className="flex justify-between text-gray-600">
                                    <span>Envío ($4.00/lb)</span>
                                    <span className="font-medium">${shippingCost.toFixed(2)}</span>
                                </div>

                                {rewardCoupon && (
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>Cupón de Recompensa</span>
                                        <span>-${rewardCoupon.amount.toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                                    <span>Total a Pagar</span>
                                    <span className="text-blue-900">
                                        ${Math.max(0, totalWithShipping - (rewardCoupon?.amount || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Cupones de Recompensa */}
                            <div className="mt-4">
                                <CouponSelector
                                    subtotal={productSubtotal + perfumeSubtotal}
                                    onCouponApplied={setRewardCoupon}
                                    appliedCoupon={rewardCoupon}
                                />
                            </div>

                            {!showCheckoutForm ? (
                                user ? (
                                    <button
                                        onClick={() => setShowCheckoutForm(true)}
                                        className="w-full mt-6 bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors"
                                    >
                                        Continuar Compra
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full mt-6 bg-yellow-500 text-blue-900 py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <User className="h-5 w-5" /> Iniciar Sesión para Comprar
                                    </button>
                                )
                            ) : (
                                selectedPaymentMethod === 'paypal' ? (
                                    <div className="mt-6 space-y-4">
                                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                                            <input
                                                type="checkbox"
                                                id="terms-checkbox"
                                                checked={termsAccepted}
                                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                                className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <label htmlFor="terms-checkbox" className="text-sm text-gray-700 cursor-pointer">
                                                He leído y acepto los <Link to="/terminos" target="_blank" className="text-blue-600 font-medium hover:underline">Términos y Condiciones</Link>,
                                                la <Link to="/politica" target="_blank" className="text-blue-600 font-medium hover:underline">Política de Privacidad</Link> y
                                                la <Link to="/devoluciones" target="_blank" className="text-blue-600 font-medium hover:underline">Política de Devoluciones</Link>.
                                            </label>
                                        </div>

                                        {(!customerInfo.name || !customerInfo.lastName || !customerInfo.email || !customerInfo.phone || !customerInfo.address || !termsAccepted) ? (
                                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                                                <p className="text-yellow-800 font-medium text-sm">
                                                    🔒 Para habilitar el pago, completa todos los datos de envío y acepta los términos.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="z-0 relative space-y-4">
                                                <div className="relative z-0">
                                                    <PayPalButtons
                                                        fundingSource="paypal"
                                                        style={{ layout: "vertical", label: "pay", color: "gold" }}
                                                        createOrder={(data, actions) => {
                                                            // ... createOrder logic
                                                            const finalAmount = Math.max(0, totalWithShipping - (rewardCoupon?.amount || 0));
                                                            return actions.order.create({
                                                                intent: "CAPTURE",
                                                                application_context: {
                                                                    brand_name: "COMPRASEXPRESS",
                                                                    shipping_preference: "NO_SHIPPING",
                                                                    landing_page: "LOGIN",
                                                                    user_action: "PAY_NOW"
                                                                },
                                                                purchase_units: [{
                                                                    amount: {
                                                                        currency_code: 'USD',
                                                                        value: finalAmount.toFixed(2)
                                                                    }
                                                                }]
                                                            });
                                                        }}
                                                        onApprove={async (data, actions) => {
                                                            if (actions.order) {
                                                                try {
                                                                    const details = await actions.order.capture();
                                                                    await handleCheckout(details.id);
                                                                } catch (error) {
                                                                    console.error("Error capturando pago:", error);
                                                                    toast.error("Error al procesar el pago de PayPal");
                                                                }
                                                            }
                                                        }}
                                                        onError={(err) => {
                                                            console.error("PayPal Error:", err);
                                                            toast.error("Error PayPal. Intente iniciar sesión para pruebas Sandbox.");
                                                        }}
                                                    />
                                                </div>

                                                <div className="relative z-0">
                                                    <PayPalButtons
                                                        fundingSource="card"
                                                        style={{ layout: "vertical", label: "pay" }}
                                                        createOrder={(data, actions) => {
                                                            const finalAmount = Math.max(0, totalWithShipping - (rewardCoupon?.amount || 0));
                                                            return actions.order.create({
                                                                intent: "CAPTURE",
                                                                application_context: {
                                                                    brand_name: "COMPRASEXPRESS",
                                                                    shipping_preference: "NO_SHIPPING",
                                                                    landing_page: "LOGIN",
                                                                    user_action: "PAY_NOW"
                                                                },
                                                                purchase_units: [{
                                                                    amount: {
                                                                        currency_code: 'USD',
                                                                        value: finalAmount.toFixed(2)
                                                                    }
                                                                }]
                                                            });
                                                        }}
                                                        onApprove={async (data, actions) => {
                                                            if (actions.order) {
                                                                try {
                                                                    const details = await actions.order.capture();
                                                                    await handleCheckout(details.id);
                                                                } catch (error) {
                                                                    console.error("Error capturando pago:", error);
                                                                    toast.error("Error al procesar el pago de PayPal");
                                                                }
                                                            }
                                                        }}
                                                        onError={(err) => {
                                                            console.error("Card Error:", err);
                                                            toast.error("Pago rechazado. En Sandbox usa: 4111 1111 1111 1111");
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleCheckout()}
                                        disabled={processingSale || (selectedPaymentMethod === 'banco_pichincha' && !receiptFile)}
                                        className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {processingSale ? 'Procesando...' : 'Finalizar Pedido'}
                                    </button>
                                )
                            )}

                            {showCheckoutForm && (
                                <button
                                    onClick={() => setShowCheckoutForm(false)}
                                    className="w-full mt-3 text-gray-500 text-sm hover:underline"
                                >
                                    Volver al carrito
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            {/* Mobile Menu Drawer */}
            {showMobileMenu && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden" onClick={() => setShowMobileMenu(false)} style={{ margin: 0 }}>
                    <div className="bg-white w-72 h-full shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b bg-blue-900 text-white">
                            <span className="font-bold text-lg">Menú</span>
                            <button onClick={() => setShowMobileMenu(false)} className="text-white hover:text-gray-200">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {user ? (
                                <div className="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-blue-200 p-2 rounded-full"><User className="h-5 w-5 text-blue-800" /></div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{user.displayName}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <button onClick={() => navigate('/login')} className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-lg shadow-sm">
                                        <User className="h-5 w-5" /> Iniciar Sesión / Registrarse
                                    </button>
                                </div>
                            )}

                            <div className="space-y-1">
                                <button onClick={() => navigate('/')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                    Inicio
                                </button>
                                {user && (
                                    <>
                                        <button onClick={() => navigate('/my-orders')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                            <Package className="h-5 w-5 text-gray-400" /> Mis Pedidos
                                        </button>
                                        {(isVerifiedSeller || isAdmin) && (
                                            <button onClick={() => navigate('/dashboard')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                                <LayoutDashboard className="h-5 w-5 text-yellow-500" /> Panel Vendedor
                                            </button>
                                        )}
                                        <div className="my-2 border-t border-gray-100"></div>
                                        <button onClick={handleLogout} className="w-full text-left p-3 hover:bg-red-50 rounded-lg flex items-center gap-3 font-medium text-red-600">
                                            <LogOut className="h-5 w-5" /> Cerrar Sesión
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t text-center text-xs text-gray-400">
                            v1.0.0 &copy; 2025 Compras Express
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default CartPage;
