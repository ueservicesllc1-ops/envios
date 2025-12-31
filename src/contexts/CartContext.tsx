import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Perfume } from '../types';
import toast from 'react-hot-toast';

interface CartItem {
    product?: Product;
    perfume?: Perfume;
    quantity: number;
    type: 'product' | 'perfume';
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: Product | Perfume, type: 'product' | 'perfume') => void;
    removeFromCart: (itemId: string, type: 'product' | 'perfume') => void;
    updateCartQuantity: (itemId: string, quantity: number, type: 'product' | 'perfume') => void;
    clearCart: () => void;
    cartTotal: number;
    cartItemsCount: number;
    // Totales específicos
    perfumeSubtotal: number;
    productSubtotal: number;
    // Cupón
    couponCode: string;
    setCouponCode: (code: string) => void;
    couponDiscount: number;
    setCouponDiscount: (discount: number) => void;
    couponActive: boolean;
    setCouponActive: (active: boolean) => void;
    enteredCouponCode: string; // Nuevo
    setEnteredCouponCode: (code: string) => void; // Nuevo
    appliedCoupon: boolean;
    setAppliedCoupon: (applied: boolean) => void;
    activeCouponId: string | null; // Nuevo
    setActiveCouponId: (id: string | null) => void; // Nuevo
    couponDiscountAmount: number;

    // Envío
    shippingCost: number;
    shippingWeight: number;
    totalWithShipping: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>(() => {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    // Persistir carrito
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    // Estados de cupón
    const [couponCode, setCouponCode] = useState('');
    const [enteredCouponCode, setEnteredCouponCode] = useState(''); // Nuevo
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponActive, setCouponActive] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState(false);
    const [activeCouponId, setActiveCouponId] = useState<string | null>(null); // Nuevo
    const [globalDiscount, setGlobalDiscount] = useState(0); // Podrías traerlo de settings

    // Constantes
    const SHIPPING_PRICE_PER_LB = 5;
    const DEFAULT_PERFUME_WEIGHT_GRAMS = 400;

    const addToCart = (item: Product | Perfume, type: 'product' | 'perfume') => {
        if (type === 'product') {
            const product = item as Product;
            const existingItem = cart.find(cartItem => cartItem.type === 'product' && cartItem.product?.id === product.id);

            if (existingItem) {
                setCart(cart.map(cartItem =>
                    cartItem.type === 'product' && cartItem.product?.id === product.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                ));
            } else {
                setCart([...cart, { product, type: 'product', quantity: 1 }]);
            }
        } else {
            const perfume = item as Perfume;
            const existingItem = cart.find(cartItem => cartItem.type === 'perfume' && cartItem.perfume?.id === perfume.id);

            if (existingItem) {
                setCart(cart.map(cartItem =>
                    cartItem.type === 'perfume' && cartItem.perfume?.id === perfume.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                ));
            } else {
                setCart([...cart, { perfume, type: 'perfume', quantity: 1 }]);
            }
        }
        toast.success('Agregado al carrito');
    };

    const removeFromCart = (itemId: string, type: 'product' | 'perfume') => {
        setCart(cart.filter(cartItem => {
            if (type === 'product') {
                return !(cartItem.type === 'product' && cartItem.product?.id === itemId);
            } else {
                return !(cartItem.type === 'perfume' && cartItem.perfume?.id === itemId);
            }
        }));
        toast.success('Eliminado del carrito');
    };

    const updateCartQuantity = (itemId: string, quantity: number, type: 'product' | 'perfume') => {
        if (quantity <= 0) {
            removeFromCart(itemId, type);
            return;
        }
        setCart(cart.map(cartItem => {
            if (type === 'product' && cartItem.type === 'product' && cartItem.product?.id === itemId) {
                return { ...cartItem, quantity };
            } else if (type === 'perfume' && cartItem.type === 'perfume' && cartItem.perfume?.id === itemId) {
                return { ...cartItem, quantity };
            }
            return cartItem;
        }));
    };

    const clearCart = () => setCart([]);

    // Cálculos
    const perfumeSubtotal = cart.reduce((sum, item) => {
        if (item.type === 'perfume' && item.perfume) {
            // Nota: El descuento global debería venir de algún lado, por ahora simplificado
            return sum + (item.perfume.price * item.quantity);
        }
        return sum;
    }, 0);

    const productSubtotal = cart.reduce((sum, item) => {
        if (item.type === 'product' && item.product) {
            return sum + ((item.product.salePrice2 || item.product.salePrice1) * item.quantity);
        }
        return sum;
    }, 0);

    const couponDiscountAmount = (appliedCoupon && couponActive) ? couponDiscount : 0;

    const cartTotal = productSubtotal + perfumeSubtotal - couponDiscountAmount;
    const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Envío
    const calculateTotalWeight = (): number => {
        let totalPounds = 0;
        for (const item of cart) {
            let itemWeightLbs = 0;

            if (item.type === 'product') {
                let w = item.product?.weight || 0;

                // Corrección para productos FB que tengan peso default (1 o 0)
                if (item.product?.origin === 'fivebelow') {
                    if (w === 1 || w === 0) w = 0.30;
                }

                // Lógica de libras vs gramos
                if (item.product?.origin === 'fivebelow' || w < 20) {
                    itemWeightLbs = w;
                } else {
                    itemWeightLbs = w / 453.592;
                }
            } else {
                itemWeightLbs = DEFAULT_PERFUME_WEIGHT_GRAMS / 453.592;
            }
            totalPounds += itemWeightLbs * item.quantity;
        }

        // Mínimo 1 libra
        const finalWeight = Math.ceil(totalPounds * 100) / 100;
        return Math.max(1, finalWeight);
    };

    const shippingWeight = calculateTotalWeight();
    const shippingCost = shippingWeight * SHIPPING_PRICE_PER_LB;
    const totalWithShipping = cartTotal + shippingCost;

    return (
        <CartContext.Provider value={{
            cart, addToCart, removeFromCart, updateCartQuantity, clearCart,
            cartTotal, cartItemsCount, perfumeSubtotal, productSubtotal,
            couponCode, setCouponCode, couponDiscount, setCouponDiscount,
            couponActive, setCouponActive, enteredCouponCode, setEnteredCouponCode,
            appliedCoupon, setAppliedCoupon,
            activeCouponId, setActiveCouponId, // Nuevo
            couponDiscountAmount, shippingCost, shippingWeight, totalWithShipping
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
