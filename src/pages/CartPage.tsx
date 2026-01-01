import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, CreditCard, ShoppingCart, User, X, Check, Upload, CheckCircle, Menu, Package, LayoutDashboard, LogOut, Wallet, Truck, Search, ChevronDown, MapPin, Phone } from 'lucide-react';
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
import { userService, SavedAddress } from '../services/userPreferencesService';
import AddressModal from '../components/AddressModal';
import { emailService } from '../services/emailService';
import { format, addDays } from 'date-fns';

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

    // Direcciones guardadas
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showAddressSelector, setShowAddressSelector] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [stockErrors, setStockErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (user) loadAddresses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadAddresses = async () => {
        if (!user) return;
        const addrs = await userService.getAddresses(user.uid);
        setSavedAddresses(addrs);
    };

    // Auto-seleccionar dirección default o primera
    useEffect(() => {
        if (savedAddresses.length > 0 && !selectedAddressId) {
            const def = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
            handleSelectAddress(def.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedAddresses]);

    const handleSelectAddress = (id: string) => {
        const addr = savedAddresses.find(a => a.id === id);
        if (addr) {
            setSelectedAddressId(id);
            // Actualizar customerInfo para el checkout (backend compatibilidad)
            setCustomerInfo({
                name: addr.fullName.split(' ')[0],
                lastName: addr.fullName.split(' ').slice(1).join(' '),
                email: user?.email || '',
                phone: addr.phone,
                address: `${addr.address}\n${addr.city}, ${addr.province}\nRef: ${addr.reference || ''}\nCI: ${addr.identityCard || ''}`
            });
            setShowAddressSelector(false);
        }
    };

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
            const product = item.product || item.perfume;
            if (!product) continue;

            const isProduct = item.type === 'product';
            const isFBorWG = isProduct && ((product as any).origin === 'fivebelow' || (product as any).origin === 'walgreens');
            const isSpecialPrice = isProduct && ((product as any).salePrice2 === -10 || (product as any).salePrice1 === -10);

            // Estos productos son bajo pedido y no requieren validación de stock físico
            if (isFBorWG || isSpecialPrice) continue;

            // Buscar stock globalmente por producto 
            const inventory = await inventoryService.getByProductId(product.id);
            if (inventory && inventory.quantity < item.quantity) {
                return {
                    valid: false,
                    message: `Stock insuficiente para ${product.name}. Disponible: ${inventory.quantity}`
                };
            }
        }
        return { valid: true };
    };

    const handleUpdateQuantity = async (itemId: string, newQuantity: number, type: 'product' | 'perfume') => {
        const currentItem = cart.find(i => (type === 'product' && i.product?.id === itemId) || (type === 'perfume' && i.perfume?.id === itemId));
        if (!currentItem) return;

        if (newQuantity <= 0) {
            removeFromCart(itemId, type);
            // Limpiar error si se elimina
            const newErrors = { ...stockErrors };
            delete newErrors[itemId];
            setStockErrors(newErrors);
            return;
        }

        // Si estamos incrementando, validar stock
        if (newQuantity > currentItem.quantity) {
            const product = currentItem.product || currentItem.perfume;
            const isProduct = currentItem.type === 'product';
            const isFBorWG = isProduct && ((product as any).origin === 'fivebelow' || (product as any).origin === 'walgreens');
            const isSpecialPrice = isProduct && ((product as any).salePrice2 === -10 || (product as any).salePrice1 === -10);

            // Solo validar si NO es bajo pedido
            if (!isFBorWG && !isSpecialPrice) {
                const inventory = await inventoryService.getByProductId(itemId);
                if (inventory && inventory.quantity < newQuantity) {
                    setStockErrors(prev => ({
                        ...prev,
                        [itemId]: `Solo ${inventory.quantity} disponible(s)`
                    }));
                    return;
                }
            }
        }

        // Si llegamos aquí, la cantidad es válida, limpiamos el error si existía
        if (stockErrors[itemId]) {
            const newErrors = { ...stockErrors };
            delete newErrors[itemId];
            setStockErrors(newErrors);
        }

        updateCartQuantity(itemId, newQuantity, type);
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
        if (!customerInfo.address || !customerInfo.phone) {
            toast.error('Por favor selecciona una dirección de envío válida');
            // Si estuviéramos en modo lista, ir al checkout (aunque ya deberíamos estar ahí)
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
            // Si hay errores de stock, volver a la vista del carrito para que los vean
            setShowCheckoutForm(false);

            // Poblar stockErrors para que se vean los mensajitos inline
            const newErrors: Record<string, string> = {};
            for (const item of cart) {
                const product = item.product || item.perfume;
                if (!product) continue;

                const inventory = await inventoryService.getByProductId(product.id);
                if (inventory && inventory.quantity < item.quantity) {
                    newErrors[product.id] = `Solo ${inventory.quantity} disponible(s)`;
                }
            }
            setStockErrors(newErrors);
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

            const saleItems = cart.map((item) => {
                const product = item.product;
                const perfume = item.perfume;

                if (product) {
                    return {
                        productId: product.id,
                        productName: product.name,
                        productSku: product.sku || '',
                        quantity: item.quantity,
                        unitPrice: Number(product.salePrice2 || product.salePrice1),
                        totalPrice: Number((product.salePrice2 || product.salePrice1) * item.quantity),
                        imageUrl: product.imageUrl || '',
                        type: 'product',
                        origin: product.origin || '',
                        location: 'Bodega USA',
                        salePrice1: product.salePrice1 || 0,
                        salePrice2: product.salePrice2 || 0
                    };
                } else if (perfume) {
                    return {
                        productId: perfume.id,
                        productName: `${perfume.brand} - ${perfume.name}`,
                        productSku: 'PERFUME',
                        quantity: item.quantity,
                        unitPrice: Number(perfume.price),
                        totalPrice: Number(perfume.price * item.quantity),
                        imageUrl: perfume.imageUrl || '',
                        type: 'perfume',
                        location: 'Bodega USA'
                    };
                }
                return null;
            }).filter(Boolean);

            const saleNumber = `VENTA-${Date.now()}`;
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

            const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

            const saleData: any = {
                securityCode,
                number: saleNumber,
                items: saleItems,
                totalAmount: finalTotal,
                shippingCost: shippingCost || 0,
                shippingWeight: shippingWeight || 0,
                customerName: `${customerInfo.name} ${customerInfo.lastName}`.trim(),
                customerEmail: customerInfo.email || '',
                customerPhone: customerInfo.phone || '',
                customerAddress: customerInfo.address || '',
                status: saleStatus,
                paymentMethod: selectedPaymentMethod || 'banco_pichincha',
                receiptUrl: receiptUrl || '',
                notes: appliedCoupon && couponCode
                    ? `Venta desde Tienda Online - Cupón aplicado: ${couponCode} (-$${couponDiscountAmount})`
                    : 'Venta desde Tienda Online',
                createdAt: new Date()
            };

            if (paypalTransactionId) {
                saleData.paypalTransactionId = paypalTransactionId;
            }

            await onlineSaleService.create(saleData);

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

            // 🎯 ENVIAR EMAIL DE CONFIRMACIÓN (solo si pago confirmado)
            if (saleStatus === 'confirmed' && customerInfo.email) {
                try {
                    await emailService.sendCompraExitosa({
                        customerName: `${customerInfo.name} ${customerInfo.lastName}`,
                        customerEmail: customerInfo.email,
                        orderNumber: saleNumber,
                        securityCode: securityCode,
                        totalAmount: finalTotal,
                        items: cart.map(item => ({
                            name: item.type === 'product' ? item.product!.name : item.perfume!.name,
                            quantity: item.quantity,
                            price: item.type === 'product' ? item.product!.salePrice1 : item.perfume!.price
                        })),
                        deliveryAddress: customerInfo.address,
                        estimatedDate: format(addDays(new Date(), 7), 'dd/MM/yyyy')
                    });
                    console.log('✅ Email de confirmación enviado');
                } catch (emailError) {
                    console.error('Error enviando email:', emailError);
                    // No bloqueamos el flujo si falla el email
                }
            }

            // ÉXITO
            clearCart();
            // Redirigir a página de éxito
            navigate('/order-success', { state: { orderNumber: saleNumber, securityCode } });

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
                                            <button onClick={() => navigate('/my-addresses')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                                                <MapPin className="h-4 w-4" /> Mis direcciones
                                            </button>
                                            <button onClick={() => navigate('/profile')} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                                                <User className="h-4 w-4" /> Configuración
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
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => handleUpdateQuantity(item.product?.id || item.perfume?.id || '', item.quantity - 1, item.type)}
                                                                    className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-4 text-center font-medium">{item.quantity}</span>
                                                                <button
                                                                    onClick={() => handleUpdateQuantity(item.product?.id || item.perfume?.id || '', item.quantity + 1, item.type)}
                                                                    className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                            {stockErrors[item.product?.id || item.perfume?.id || ''] && (
                                                                <span className="text-[10px] text-red-500 font-medium animate-pulse">
                                                                    {stockErrors[item.product?.id || item.perfume?.id || '']}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right leading-tight">
                                                        <p className="font-bold text-lg text-blue-900">${(price * item.quantity).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            /* Formulario de Checkout */
                            /* Formulario de Checkout Simplificado (Amazon Style) */
                            <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                                <h2 className="text-xl font-bold mb-4">Información de Envío</h2>

                                {savedAddresses.length === 0 ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center mb-6">
                                        <MapPin className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">No tienes direcciones guardadas</h3>
                                        <p className="text-gray-600 mb-6">Para continuar, necesitas agregar una dirección de envío.</p>
                                        <button
                                            onClick={() => setShowAddressModal(true)}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto"
                                        >
                                            <Plus className="h-5 w-5" /> Agregar Dirección
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        {showAddressSelector ? (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <h3 className="font-bold text-gray-700">Selecciona una dirección:</h3>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {savedAddresses.map(addr => (
                                                        <div
                                                            key={addr.id}
                                                            onClick={() => handleSelectAddress(addr.id)}
                                                            className={`border-2 rounded-xl p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-3 transition-all ${selectedAddressId === addr.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200'}`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 transition-colors ${selectedAddressId === addr.id ? 'border-blue-600' : 'border-gray-300'}`}>
                                                                {selectedAddressId === addr.id && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-gray-900">{addr.alias}</span>
                                                                    {addr.isDefault && <span className="text-[10px] bg-gray-200 px-1.5 rounded-full text-gray-600 font-bold">Default</span>}
                                                                </div>
                                                                <p className="font-medium text-gray-800">{addr.fullName}</p>
                                                                <p className="text-sm text-gray-600">{addr.address}</p>
                                                                <p className="text-sm text-gray-600">{addr.city}, {addr.province}</p>
                                                                <p className="text-xs text-gray-500 mt-1">Tel: {addr.phone}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={() => setShowAddressModal(true)} className="text-blue-600 font-bold text-sm flex items-center gap-1 mt-2 hover:underline">
                                                    <Plus className="h-4 w-4" /> Agregar nueva dirección
                                                </button>
                                            </div>
                                        ) : (
                                            // Resumen Selected (Amazon Style)
                                            <div className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                                                <div className="flex items-start gap-4">
                                                    <div className="pt-1">
                                                        <MapPin className="h-5 w-5 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        {(() => {
                                                            const addr = savedAddresses.find(a => a.id === selectedAddressId);
                                                            if (!addr) return <span className="text-red-500 font-medium">Selecciona una dirección de envío</span>;
                                                            return (
                                                                <>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-gray-900 text-sm">Enviar a {addr.fullName}</span>
                                                                        {addr.alias && <span className="text-xs bg-gray-200 px-1.5 rounded text-gray-600">{addr.alias}</span>}
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                                                                    <p className="text-sm text-gray-600">{addr.city}, {addr.province}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">Tel: {addr.phone}</p>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setShowAddressSelector(true)}
                                                    className="text-blue-600 text-sm font-bold hover:underline px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                                He leído y acepto los{' '}
                                                <span
                                                    onClick={(e) => { e.preventDefault(); window.open('/legal/terminos.html', '_blank'); }}
                                                    className="text-blue-600 font-medium hover:underline cursor-pointer"
                                                >
                                                    Términos y Condiciones
                                                </span>, la{' '}
                                                <span
                                                    onClick={(e) => { e.preventDefault(); window.open('/legal/politica.html', '_blank'); }}
                                                    className="text-blue-600 font-medium hover:underline cursor-pointer"
                                                >
                                                    Política de Privacidad
                                                </span>{' '}y la{' '}
                                                <span
                                                    onClick={(e) => { e.preventDefault(); window.open('/legal/devoluciones.html', '_blank'); }}
                                                    className="text-blue-600 font-medium hover:underline cursor-pointer"
                                                >
                                                    Política de Devoluciones
                                                </span>.
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
                                        <button onClick={() => navigate('/my-addresses')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                            <MapPin className="h-5 w-5 text-gray-400" /> Mis Direcciones
                                        </button>
                                        <button onClick={() => navigate('/profile')} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                                            <User className="h-5 w-5 text-gray-400" /> Configuración
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
            {/* Modal de Dirección */}
            {showAddressModal && (
                <AddressModal
                    onClose={() => setShowAddressModal(false)}
                    onAddressSaved={loadAddresses}
                />
            )}
        </div>
    );
};

export default CartPage;
