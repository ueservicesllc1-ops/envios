import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Search, Menu, X, LogIn, Star, Truck, Shield, Heart, MapPin, CheckCircle, ChevronDown, User, LogOut, LayoutDashboard, CreditCard, Copy, Wallet, DollarSign, Users, Clock, Ticket, Mail, Phone, MessageSquare, Send, Bell, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { onlineSaleService, OnlineSaleItem } from '../services/onlineSaleService';
import { perfumeService } from '../services/perfumeService';
import { perfumeSettingsService } from '../services/perfumeSettingsService';
import { sellerService } from '../services/sellerService';
import { userService, SavedAddress } from '../services/userPreferencesService';
import AddressModal from '../components/AddressModal';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../contexts/CartContext';

import { Product, InventoryItem, Perfume } from '../types';
import { getImageUrl } from '../utils/imageUtils';
import { storage, auth } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { storeSettingsService, StoreSettings } from '../services/storeSettingsService';
import AdvertisingCarousel from '../components/AdvertisingCarousel';
import ChatBubble from '../components/ChatBubble';
import RewardGameModal from '../components/RewardGameModal';
import { couponService } from '../services/couponService';
import { contactService } from '../services/contactService';

import toast from 'react-hot-toast';

// Precio de envío por libra
const SHIPPING_PRICE_PER_LB = 5;
const DEFAULT_PERFUME_WEIGHT_GRAMS = 400; // ~0.88 lb

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth(); // isAdmin viene de useAuth
  const { t, language } = useLanguage();

  // Estado para verificación de vendedor
  const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);

  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sendingContact, setSendingContact] = useState(false);

  // Estados para dirección
  const [userAddresses, setUserAddresses] = useState<SavedAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Cargar direcciones del usuario
  useEffect(() => {
    if (user) {
      userService.getAddresses(user.uid).then(addrs => {
        setUserAddresses(addrs);
        // Si no tiene direcciones, mostrar sugerencia después de un tiempo
        if (addrs.length === 0) {
          setTimeout(() => setShowAddressModal(true), 3500);
        }
      });
    }
  }, [user]);

  const handleAddressSaved = async () => {
    if (user) {
      const addrs = await userService.getAddresses(user.uid);
      setUserAddresses(addrs);
    }
  };

  // Inicializar formulario con datos de usuario si existe
  useEffect(() => {
    if (user && showContactModal) {
      setContactForm(prev => ({
        ...prev,
        name: user.displayName || '',
        email: user.email || ''
      }));
    }
  }, [user, showContactModal]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.message.trim()) {
      toast.error('Por favor escribe un mensaje');
      return;
    }

    setSendingContact(true);
    try {
      await contactService.createMessage(contactForm);
      toast.success('Mensaje enviado correctamente. Te contactaremos pronto.');
      setShowContactModal(false);
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error(error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSendingContact(false);
    }
  };

  // Verificar si el usuario es vendedor real
  useEffect(() => {
    const checkSellerStatus = async () => {
      if (user && user.email) {
        // Verificar si es admin
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

  const [products, setProducts] = useState<Product[]>([]);

  // Mapa de variantes para optimizar renderizado (Híbrido)
  const consolidatedVariantsMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    // Crear índice rápido
    const productsById = new Map(products.map(p => [p.id, p]));

    products.forEach(p => {
      // Estrategia 1: Hijos que apuntan al padre
      if (p.parentConsolidatedId) {
        const existing = map.get(p.parentConsolidatedId) || [];
        if (!existing.some(v => v.id === p.id)) {
          existing.push(p);
          map.set(p.parentConsolidatedId, existing);
        }
      }

      // Estrategia 2: Padre que apunta a hijos (Legacy/Backup)
      // Se procesa si existe lista de hijos, independientemente del flag isConsolidated para mayor robustez
      if (p.consolidatedProducts && Array.isArray(p.consolidatedProducts) && p.consolidatedProducts.length > 0) {
        const existing = map.get(p.id) || [];
        p.consolidatedProducts.forEach(childId => {
          const child = productsById.get(childId);
          if (child && !existing.some(v => v.id === childId)) {
            existing.push(child);
          }
        });
        map.set(p.id, existing);
      }
    });
    return map;
  }, [products]);

  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponActive, setCouponActive] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  // Estados movidos al context: cart, enteredCouponCode, appliedCoupon, etc. 

  const {
    addToCart, cartItemsCount,
    couponCode: contextCouponCode, setCouponCode: setContextCouponCode,
    couponDiscount: contextCouponDiscount, setCouponDiscount: setContextCouponDiscount,
    couponActive: contextCouponActive, setCouponActive: setContextCouponActive
  } = useCart();

  // Sincronizar estados locales de settings con el context (opcional, pero buena práctica)
  useEffect(() => {
    setContextCouponCode(couponCode);
    setContextCouponDiscount(couponDiscount);
    setContextCouponActive(couponActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, couponDiscount, couponActive]);

  // Cargar configuración de la tienda
  useEffect(() => {
    const loadStoreSettings = async () => {
      try {
        const settings = await storeSettingsService.getSettings();
        setStoreSettings(settings);
      } catch (error) {
        console.error('Error loading store settings:', error);
      }
    };
    loadStoreSettings();
  }, []);

  const [showAddToCartPopup, setShowAddToCartPopup] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ productId: string; size?: string; color?: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [priceFilter, setPriceFilter] = useState<'all' | 'under25' | 'discounts'>('all');
  const [showHowToBuy, setShowHowToBuy] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(10.00); // Bono inicial por registro
  const [pendingBalance, setPendingBalance] = useState(0);
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const referralLink = user ? `https://comprasexpress.us/?ref=${user.uid}` : '';

  // Capturar referido de URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && !user) {
      localStorage.setItem('referralCode', ref);
      toast.success('¡Código de referido detectado! Regístrate para ganar $10.', {
        icon: '🎁',
        duration: 5000
      });
    }
  }, [user]);

  const AdvertCarousel = () => {
    const [index, setIndex] = useState(0);

    const banners = [
      { text: "🚀 Envíos rápidos y seguros a todo Ecuador", bg: "bg-gradient-to-r from-blue-900 to-blue-700" },
      { text: "⚡ Entregas garantizadas en tiempo récord", bg: "bg-gradient-to-r from-green-600 to-teal-600" },
      { text: "🔒 Tu compra 100% protegida y confiable", bg: "bg-gradient-to-r from-purple-700 to-indigo-700" }
    ];

    useEffect(() => {
      const timer = setInterval(() => {
        setIndex((prev) => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="relative w-full h-full">
        <div
          className="flex h-full w-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner, i) => (
            <div key={i} className={`min-w-full w-full h-full flex items-center justify-center text-white font-bold text-sm md:text-base px-4 ${banner.bg}`}>
              {banner.text}
            </div>
          ))}
        </div>

        {/* Indicadores simples */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {banners.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1 bg-white/50'}`} />
          ))}
        </div>
      </div>
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('¡Enlace copiado al portapapeles!');
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada correctamente');
      setShowUserMenu(false);
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [processingSale, setProcessingSale] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | Perfume | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-rellenar email del usuario autenticado en el formulario


  // Obtener slides habilitados dinámicamente
  const enabledSlides = storeSettings?.heroSlides.filter(slide => slide.enabled) || [];
  const totalSlides = enabledSlides.length;

  // Auto-rotate del carrusel cada 5 segundos
  useEffect(() => {
    if (totalSlides === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [totalSlides]);

  // Mostrar modal de recompensas al cargar la página
  useEffect(() => {
    const checkAndShowRewardModal = async () => {
      if (!user) return;

      try {
        const hasPlayed = await couponService.hasPlayedEver(user.uid);
        if (!hasPlayed) {
          // Esperar 2 segundos para que cargue la página primero
          setTimeout(() => {
            setShowRewardModal(true);
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking reward status:', error);
      }
    };

    checkAndShowRewardModal();
  }, [user]);

  // Cargar cupones cuando se abre la wallet
  useEffect(() => {
    if (showReferralModal && user) {
      setLoadingCoupons(true);
      couponService.getUserCoupons(user.uid)
        .then(coupons => {
          setUserCoupons(coupons);
        })
        .catch(err => console.error('Error loading coupons:', err))
        .finally(() => setLoadingCoupons(false));
    }
  }, [showReferralModal, user]);


  // Función para limpiar HTML y convertir a texto plano o renderizar HTML de forma segura
  const cleanDescription = (html: string): string => {
    if (!html) return '';
    // Crear un elemento temporal para extraer el texto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Función para renderizar HTML de forma segura
  const renderHTML = (html: string) => {
    if (!html) return null;
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Función para mezclar array aleatoriamente (Fisher-Yates shuffle)
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('========================================');
      console.log('🛒 CARGANDO TIENDA PRINCIPAL (HOME)');
      console.log('========================================');

      const [productsData, perfumesData, inventoryData, settings] = await Promise.all([
        productService.getAll(),
        perfumeService.getActive(),
        inventoryService.getAll(),
        perfumeSettingsService.getSettings()
      ]);

      console.log('📦 Inventario cargado:', inventoryData.length, 'items');
      console.log('📦 Productos cargados:', productsData.length);

      // Buscar producto KIT KISS
      const kitKissProduct = productsData.find(p =>
        p.name && p.name.toUpperCase().includes('KIT KISS') && p.name.toUpperCase().includes('STIKERS')
      );

      if (kitKissProduct) {
        console.log('🔍 PRODUCTO KIT KISS ENCONTRADO:', {
          id: kitKissProduct.id,
          name: kitKissProduct.name,
          sku: kitKissProduct.sku
        });

        // Buscar en inventario
        const kitKissInventory = inventoryData.filter(inv =>
          inv.productId === kitKissProduct.id || (inv.product?.sku === kitKissProduct.sku)
        );

        console.log('🔍 ITEMS EN INVENTARIO PARA KIT KISS:', kitKissInventory.length);
        kitKissInventory.forEach((inv, idx) => {
          console.log(`   ${idx + 1}. ProductId: ${inv.productId}, SKU: ${inv.product?.sku}, Ubicación: ${inv.location}, Status: ${inv.status}, Cantidad: ${inv.quantity}`);
        });

        const stockItems = kitKissInventory.filter(inv => inv.status === 'stock');
        const totalStock = stockItems.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
        console.log('🔍 STOCK TOTAL DISPONIBLE:', totalStock);
      } else {
        console.log('⚠️ No se encontró producto KIT KISS STIKERS UNAS');
      }

      // Mezclar productos aleatoriamente cada vez que se cargan
      const shuffledProducts = shuffleArray(productsData);
      const shuffledPerfumes = shuffleArray(perfumesData);

      setProducts(shuffledProducts);
      setPerfumes(shuffledPerfumes);
      setInventory(inventoryData);
      setGlobalDiscount(settings.globalDiscountPercentage || 0);
      setCouponCode(settings.couponCode || '');
      setCouponDiscount(settings.couponDiscountPercentage || 0);
      setCouponActive(settings.couponActive || false);

      console.log('✅ Tienda principal cargada');
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getInventoryForProduct = (productId: string): InventoryItem | null => {
    return inventory.find(item => item.productId === productId) || null;
  };

  const getAvailableQuantity = (productId: string): number => {
    const inventoryItem = getInventoryForProduct(productId);
    if (!inventoryItem) {
      return 0;
    }
    // Mostrar stock disponible si está en 'stock' o 'in-transit' (disponible para venta)
    if (inventoryItem.status === 'stock' || inventoryItem.status === 'in-transit') {
      return inventoryItem.quantity;
    }
    return 0;
  };

  const getProductLocation = (productId: string): string | null => {
    const inventoryItem = getInventoryForProduct(productId);
    if (!inventoryItem || inventoryItem.quantity === 0) return null;
    // Incluir productos con status 'stock' o 'in-transit'
    if (inventoryItem.status !== 'stock' && inventoryItem.status !== 'in-transit') return null;

    const location = inventoryItem.location?.toLowerCase() || '';
    if (location.includes('ecuador') || location === 'bodega ecuador') {
      return 'Bodega Ecuador';
    }
    if (location.includes('usa') || location.includes('principal') || location.includes('bodega')) {
      return 'Bodega USA';
    }
    return inventoryItem.location || 'Bodega USA';
  };

  // Categorías principales fijas (mapeadas a traducciones)
  const mainCategories = [
    { key: 'Ropa', label: t('home.clothing') },
    { key: 'Zapatos', label: t('home.shoes') },
    { key: 'Vitaminas', label: t('home.vitamins') }
  ];

  // Obtener todas las marcas únicas de perfumes
  const perfumeBrands = Array.from(new Set(perfumes.map(p => p.brand).filter(Boolean))).sort();

  // Combinar productos y perfumes para mostrar en la tienda y mezclar según preferencias
  const [rankedItems, setRankedItems] = useState<{ type: 'product' | 'perfume', item: Product | Perfume }[]>([]);

  useEffect(() => {
    const rankProducts = async () => {
      let baseItems = [
        ...products.map(p => ({ type: 'product' as const, item: p }))
      ];

      try {
        if (user) {
          const preferences = await userService.getUserPreferences(user.uid);

          if (preferences) {
            const viewedCategories = preferences.viewedCategories || {};
            const favoriteProducts = new Set(preferences.viewedProducts || []);

            // Algoritmo de Ranking Simple
            baseItems.sort((a, b) => {
              const catA = (a.item as Product).category || 'Other';
              const catB = (b.item as Product).category || 'Other';

              // Peso 1: Categoría más vista
              const scoreA = (viewedCategories[catA] || 0);
              const scoreB = (viewedCategories[catB] || 0);

              // Peso 2: Productos vistos recientemente (si estuvieran en la lista)
              // (Aquí podríamos dar boost si el producto específico fue visto, pero ya fue visto, mejor mostrar similares)

              return scoreB - scoreA; // Mayor score primero
            });

            console.log('✨ Productos ordenados por preferencia de usuario');
          } else {
            // Si no hay preferencias, usar shuffle
            baseItems = shuffleArray(baseItems);
          }
        } else {
          // Usuario no logueado: Aleatorio
          baseItems = shuffleArray(baseItems);
        }
      } catch (err) {
        console.error('Error ranking products:', err);
        baseItems = shuffleArray(baseItems);
      }

      setRankedItems(baseItems);
    };

    rankProducts();
  }, [products, perfumes, user, shuffleArray]);

  const allItems = rankedItems;

  const filteredProducts = allItems.filter(({ type, item }) => {
    const product = item as Product;

    // Filtro por ubicación (Solo Bodega USA/General y Bodega Ecuador)
    let isValidLocation = false;

    // Para productos consolidados, verificar ubicación de sus variantes hijas
    const variants = consolidatedVariantsMap.get(product.id);
    if (variants && variants.length > 0) {
      // Es un producto consolidado con variantes - verificar ubicación de variantes
      isValidLocation = variants.some(variant => {
        const variantLocation = getProductLocation(variant.id)?.toLowerCase() || '';
        return variantLocation.includes('usa') || variantLocation.includes('general') || variantLocation.includes('ecuador');
      });
    } else {
      // Producto normal - verificar su propia ubicación
      // Si es Five Below o Walgreens, siempre es válido (se asume ubicación USA virtual)
      if (product.origin === 'fivebelow' || product.origin === 'walgreens') {
        isValidLocation = true;
      } else {
        const location = getProductLocation(product.id)?.toLowerCase() || '';
        isValidLocation = location.includes('usa') || location.includes('general') || location.includes('ecuador');
      }
    }

    if (!isValidLocation) return false;

    // Filtro por Categoría
    if (selectedCategory && selectedCategory !== 'all') {
      const prodCategory = (product.category || '').toLowerCase();
      // Mapeo simple: si la categoría seleccionada está contenida en la categoría del producto (o viceversa para flexibilidad)
      // Ajuste específico para categorías comunes
      if (selectedCategory === 'electronics' && !prodCategory.includes('electr')) return false;
      if (selectedCategory === 'perfumes' && !prodCategory.includes('perfum')) return false;
      if (selectedCategory === 'clothing' && !prodCategory.includes('ropa')) return false;
      if (selectedCategory === 'shoes' && !prodCategory.includes('zapatos')) return false;
      if (selectedCategory === 'beauty' && !prodCategory.includes('belleza') && !prodCategory.includes('cosm')) return false;
      if (selectedCategory === 'home' && !prodCategory.includes('hogar')) return false;
      if (selectedCategory === 'toys' && !prodCategory.includes('juguet')) return false;
      if (selectedCategory === 'vitamins' && !prodCategory.includes('vitamin')) return false;

      // Fallback genérico por si acaso
      if (
        !prodCategory.includes(selectedCategory) &&
        selectedCategory !== 'electronics' &&
        selectedCategory !== 'perfumes' &&
        selectedCategory !== 'clothing' &&
        selectedCategory !== 'shoes' &&
        selectedCategory !== 'beauty' &&
        selectedCategory !== 'home' &&
        selectedCategory !== 'toys' &&
        selectedCategory !== 'vitamins'
      ) return false;
    }

    // Filtro Precio
    if (priceFilter === 'under25') {
      const price = product.salePrice2 || product.salePrice1 || product.originalPrice || 0;
      if (price >= 25) return false;
    } else if (priceFilter === 'discounts') {
      const price = product.salePrice2 || product.salePrice1 || product.originalPrice || 0;
      const originalPrice = product.originalPrice || 0;
      // Mostrar solo si tiene precio original mayor al precio de venta (tiene descuento)
      if (!originalPrice || originalPrice <= price) return false;
    }

    // Filtro Búsqueda
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro Categoría
    const normalizeCategory = (cat: string) => cat.trim().toLowerCase().replace(/\s+/g, ' ');
    const matchesCategory = selectedCategory === 'all' ||
      (product.category && normalizeCategory(product.category) === normalizeCategory(selectedCategory));

    // Filtro Consolidados - Ocultar productos hijos (ya que se muestran como variantes del padre)
    if (product.parentConsolidatedId) return false;

    return matchesSearch && matchesCategory;
  });

  // Paginación
  const [visibleProducts, setVisibleProducts] = useState(24);

  useEffect(() => {
    setVisibleProducts(24);
  }, [searchTerm, selectedCategory, priceFilter]);

  const handleAddToCart = (item: Product | Perfume, type: 'product' | 'perfume' = 'product') => {
    if (type === 'product') {
      const product = item as Product;

      // Five Below (FB) y Walgreens (WG) son productos bajo pedido - no validar stock
      const isFBorWG = product.origin === 'fivebelow' || product.origin === 'walgreens';

      if (!isFBorWG) {
        const availableQty = getAvailableQuantity(product.id);

        if (availableQty <= 0) {
          toast.error(`${t('home.stockAvailable')}: ${availableQty} ${t('home.units')}`);
          return;
        }
      }

      addToCart(product, 'product');
    } else {
      const perfume = item as Perfume;
      addToCart(perfume, 'perfume');
    }

    // Mostrar popup
    setShowAddToCartPopup(true);
    setTimeout(() => {
      setShowAddToCartPopup(false);
    }, 3000);
  };

  // Eliminamos funciones handleCheckout, updateCartQuantity, calculos manuales, etc.
  // Todo eso ahora vive en CartPage y CartContext.

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Estilo Envíos Ecuador (Estructura Tiendamia) */}
      <header className="sticky top-0 z-40">
        {/* Barra Principal Azul Corporativo */}
        <div className="bg-blue-900 shadow-md">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">

              {/* MOBILE HEADER: Menu + Compact Logo + Notifications + Cart */}
              <div className="md:hidden flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMobileMenu(true)} className="p-1 text-white">
                    <Menu className="h-6 w-6" />
                  </button>
                  <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                    <img src="/logo-compras-nuevo.png" alt="Compras Express" className="h-8 object-contain" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Campanita Mobile */}
                  {user && userAddresses.length === 0 && (
                    <button
                      onClick={() => setShowAddressModal(true)}
                      className="relative p-1 text-white animate-pulse"
                      title="Agrega tu dirección"
                    >
                      <Bell className="h-6 w-6" />
                      <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-blue-900"></span>
                    </button>
                  )}

                  <button
                    className="flex items-center gap-1 relative group p-1 text-white"
                    onClick={() => navigate('/cart')}
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                        {cartItemsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* DESKTOP Logo (Visible md up) */}
              <div className="hidden md:flex items-center gap-4">
                <div
                  className="flex flex-col cursor-pointer"
                  onClick={() => navigate('/')}
                >
                  <div className="flex items-center gap-2">
                    <img src="/logo-compras-nuevo.png" alt="Compras Express" className="h-10 object-contain" />
                  </div>
                  <span className="text-[10px] text-yellow-400 leading-none tracking-wide mt-1">Compra en USA y recíbelo en Ecuador</span>
                </div>

                {/* Campanita Desktop */}
                {user && userAddresses.length === 0 && (
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 rounded-full px-3 py-1 animate-pulse ml-4"
                    title="Necesitamos tu dirección para envíos"
                  >
                    <div className="relative">
                      <Bell className="h-5 w-5 text-red-200" />
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                    </div>
                    <span className="text-xs font-bold text-red-200 hidden lg:inline">Agrega tu dirección</span>
                  </button>
                )}
              </div>

              {/* Barra de Búsqueda Central (Visible md up) */}
              <div className="hidden md:flex flex-1 max-w-3xl mx-4">
                <div className="flex w-full bg-white rounded-md shadow-sm h-10 relative">
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="h-full px-3 bg-gray-100 text-gray-700 text-sm border-r border-gray-200 flex items-center gap-1 hover:bg-gray-200 transition-colors whitespace-nowrap font-medium rounded-l-md"
                    >
                      {selectedCategory === 'all' ? 'Todos' :
                        selectedCategory === 'electronics' ? 'Electrónicos' :
                          selectedCategory === 'perfumes' ? 'Perfumes' :
                            selectedCategory === 'clothing' ? 'Ropa' :
                              selectedCategory === 'shoes' ? 'Zapatos' :
                                selectedCategory === 'beauty' ? 'Belleza' :
                                  selectedCategory === 'home' ? 'Hogar' :
                                    selectedCategory === 'toys' ? 'Juguetes' :
                                      selectedCategory === 'vitamins' ? 'Vitaminas' : 'Todos'}
                      <ChevronDown className={`h-3 w-3 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showCategoryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50">
                        {[
                          { id: 'all', name: 'Todos' },
                          { id: 'electronics', name: 'Electrónicos' },
                          { id: 'perfumes', name: 'Perfumes' },
                          { id: 'clothing', name: 'Ropa' },
                          { id: 'shoes', name: 'Zapatos' },
                          { id: 'beauty', name: 'Belleza' },
                          { id: 'home', name: 'Hogar' },
                          { id: 'toys', name: 'Juguetes' },
                          { id: 'vitamins', name: 'Vitaminas' }
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-900 transition-colors ${selectedCategory === cat.id ? 'bg-blue-50 text-blue-900 font-bold' : 'text-gray-700'
                              }`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar productos, marcas y más..."
                    className="flex-1 px-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="px-5 text-gray-500 hover:text-blue-900 transition-colors rounded-r-md">
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Menú Derecho Desktop (Usuario, Wallet, Cart) - Visible md up */}
              <div className="hidden md:flex items-center gap-6 text-white text-sm font-medium">
                {user ? (
                  <div className="relative group cursor-pointer flex items-center gap-1">
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-[11px] font-normal opacity-90">Hola, {user.displayName?.split(' ')[0] || 'Usuario'}</span>
                      <span className="flex items-center gap-1 font-bold">Mi cuenta <ChevronDown className="h-3 w-3" /></span>
                    </div>

                    {/* Dropdown Usuario */}
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded shadow-xl py-2 text-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="absolute -top-1 right-4 w-3 h-3 bg-white transform rotate-45 border-t border-l border-gray-100"></div>
                      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">Conectado como</p>
                        <p className="font-bold truncate">{user.email}</p>
                      </div>
                      <button onClick={() => navigate('/my-orders')} className="w-full text-left px-4 py-2 hover:bg-gray-50 hover:text-blue-900 flex items-center gap-2">
                        <Package className="h-4 w-4" /> Mis pedidos
                      </button>
                      <button onClick={() => navigate('/my-addresses')} className="w-full text-left px-4 py-2 hover:bg-gray-50 hover:text-blue-900 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Mis direcciones
                      </button>
                      <button onClick={() => navigate('/profile')} className="w-full text-left px-4 py-2 hover:bg-gray-50 hover:text-blue-900 flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Configuración
                      </button>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center gap-2">
                        <LogOut className="h-4 w-4" /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => navigate('/login')} className="flex items-center gap-2 hover:underline">
                    <User className="h-5 w-5" /> Regístrate o Inicia sesión
                  </button>
                )}

                {/* Wallet Button */}
                {user && (
                  <button
                    className="flex items-center gap-1 relative group hover:text-green-400 transition-colors mr-4"
                    onClick={() => setShowReferralModal(true)}
                    title="Mi Billetera"
                  >
                    <Wallet className="h-6 w-6 text-yellow-400" />
                    <span className="font-bold text-sm hidden md:block">${walletBalance.toFixed(2)}</span>
                  </button>
                )}

                {/* Botón Dashboard Vendedor */}
                {(isVerifiedSeller || isAdmin) && (
                  <button
                    className="flex items-center gap-1 relative group hover:text-yellow-400 transition-colors mr-3"
                    onClick={() => navigate('/dashboard')}
                    title="Panel de Vendedor"
                  >
                    <LayoutDashboard className="h-6 w-6" />
                  </button>
                )}

                <button
                  className="flex items-center gap-1 relative group"
                  onClick={() => navigate('/cart')}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Header (Categorías) Azul un poco más claro o amarillo */}
        <div className="bg-blue-800 text-white text-xs border-t border-white/10 hidden md:block">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-8 py-2 overflow-x-auto no-scrollbar">
              <button
                className="flex items-center gap-1 font-bold uppercase tracking-wide"
                onClick={() => { setSelectedCategory('all'); setPriceFilter('all'); }}
              >
                <Menu className="h-4 w-4" /> Todas las Categorías
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setPriceFilter('discounts'); setSelectedCategory('all'); }}
                className={`hover:text-yellow-300 whitespace-nowrap ${priceFilter === 'discounts' ? 'text-yellow-400 font-bold' : ''}`}
              >
                Descuentos
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setPriceFilter('under25'); setSelectedCategory('all'); }}
                className={`hover:text-yellow-300 whitespace-nowrap ${priceFilter === 'under25' ? 'text-yellow-400 font-bold' : ''}`}
              >
                Menos de $25
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setShowHowToBuy(true); }}
                className="hover:text-yellow-300 whitespace-nowrap"
              >
                Cómo Comprar
              </button>
              <button onClick={(e) => { e.preventDefault(); navigate('/my-orders'); }} className="hover:text-yellow-300 whitespace-nowrap font-bold text-yellow-400">Mis pedidos</button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (!user) {
                    toast('Inicia sesión para obtener tu enlace', { icon: '🔒' });
                    navigate('/login');
                  } else {
                    setShowReferralModal(true);
                  }
                }}
                className="hover:text-yellow-300 whitespace-nowrap"
              >
                Invita y Gana
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content con fondo gris claro */}
      <main className="bg-gray-100 min-h-screen pb-12">

        {/* Banner Promocional Superior (Top Strip) */}
        <div className="bg-yellow-500 text-blue-900 text-center py-1 px-4">
          <p className="text-sm font-bold inline-block">
            🎁 ¡Bono por registro de $10 Dólares!*
          </p>
          <p className="text-[10px] font-medium opacity-90 mt-0.5 md:mt-0 md:ml-2 md:inline-block">
            *Este bono se usará para pagos de envíos y se deducirá 20% de este bono por cada envío hasta alcanzar el total.
          </p>
        </div>

        {/* Hero Carousel Container */}
        <div className="container mx-auto px-4 py-6">
          <div className="relative group max-w-[1200px] mx-auto">
            {/* Carousel Slides - Dinámicos desde Firebase */}
            <div className="overflow-hidden rounded-lg shadow-xl aspect-[1400/387] bg-gray-200 relative">
              {storeSettings?.heroSlides.filter(slide => slide.enabled).map((slide, index) => (
                <div key={slide.id} className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${currentSlide === index ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-full h-full relative overflow-hidden">
                    <img
                      src={slide.imageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80'}
                      alt={slide.title || `Banner ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Buttons - Flechas Circulares Fuera del Banner */}
            <button
              onClick={() => setCurrentSlide(prev => (prev === 0 ? totalSlides - 1 : prev - 1))}
              className="absolute -left-5 md:-left-6 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full shadow-lg hover:text-blue-900 transition-all hover:scale-110 z-20 border border-gray-100"
            >
              <ChevronDown className="h-6 w-6 transform rotate-90" />
            </button>
            <button
              onClick={() => setCurrentSlide(prev => (prev === totalSlides - 1 ? 0 : prev + 1))}
              className="absolute -right-5 md:-right-6 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full shadow-lg hover:text-blue-900 transition-all hover:scale-110 z-20 border border-gray-100"
            >
              <ChevronDown className="h-6 w-6 transform -rotate-90" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
              {Array.from({ length: totalSlides }, (_, i) => i).map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>



        {/* Productos Destacados Carousel */}
        {
          products.length > 0 && (
            <div className="container mx-auto px-4 mb-8">
              <div className="max-w-[1200px] mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500 fill-current" />
                    Productos Destacados
                  </h2>
                  <button
                    onClick={() => {
                      const el = document.getElementById('featured-carousel');
                      if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                    }}
                    className="text-blue-900 hover:text-blue-700 font-medium text-sm flex items-center"
                  >
                    Ver más <ChevronDown className="h-4 w-4 transform -rotate-90" />
                  </button>
                </div>

                <div className="relative group">
                  {/* Flecha Izquierda */}
                  <button
                    onClick={() => {
                      const el = document.getElementById('featured-carousel');
                      if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                    }}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-gray-800 z-10 hover:bg-white transition-all hidden md:block opacity-0 group-hover:opacity-100"
                  >
                    <ChevronDown className="h-6 w-6 transform rotate-90" />
                  </button>

                  {/* Contenedor Carrusel */}
                  <div
                    id="featured-carousel"
                    className="flex overflow-x-auto gap-4 py-2 px-1 snap-x scrollbar-hide scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {products.slice(0, 10).map((product) => {
                      // Precio y descuento
                      let price = product.salePrice2 || product.salePrice1 || 0;
                      let originalPrice = product.originalPrice || 0;
                      let discountPercentage = 0;

                      if (originalPrice && originalPrice > price) {
                        discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
                      }

                      return (
                        <div
                          key={`featured-${product.id}`}
                          onClick={() => {
                            setSelectedProduct(product);
                            setCurrentImageIndex(0);
                            // Registrar vista (categoría)
                            if (user && product.category) {
                              userService.logProductView(user.uid, product.id, product.category);
                            }
                          }}
                          className="min-w-[200px] w-[200px] md:min-w-[220px] md:w-[220px] bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer snap-start flex-shrink-0 flex flex-col"
                        >
                          {/* Tags Flotantes */}
                          <div className="relative w-full h-40 bg-white p-2 flex items-center justify-center flex-shrink-0">
                            {product.origin === 'fivebelow' && (
                              <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">FB</span>
                            )}
                            {product.origin === 'walgreens' && (
                              <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">W</span>
                            )}
                            {discountPercentage > 0 && (
                              <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                                -{discountPercentage}%
                              </span>
                            )}
                            {product.imageUrl ? (
                              <img
                                src={getImageUrl(product.imageUrl)}
                                alt={product.name}
                                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Package className="h-10 w-10 text-gray-300" />
                            )}
                          </div>

                          <div className="p-3 bg-gray-50 flex-1 flex flex-col relative z-20">
                            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1 h-10 leading-tight">
                              {product.name}
                            </h3>

                            <div className="mt-auto">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-blue-900">${price.toFixed(2)}</span>
                                {originalPrice > price && (
                                  <span className="text-xs text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(product, 'product');
                                }}
                                className="w-full mt-2 bg-white border border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white text-xs font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer relative z-30"
                              >
                                <ShoppingCart className="h-3 w-3" /> Agregar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Flecha Derecha */}
                  <button
                    onClick={() => {
                      const el = document.getElementById('featured-carousel');
                      if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                    }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-gray-800 z-10 hover:bg-white transition-all hidden md:block opacity-0 group-hover:opacity-100"
                  >
                    <ChevronDown className="h-6 w-6 transform -rotate-90" />
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Productos Menos de $10 Carousel */}
        {
          products.some(p => (p.salePrice2 || p.salePrice1 || p.originalPrice || 0) < 10) && (
            <div className="container mx-auto px-4 mb-8">
              <div className="max-w-[1200px] mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-green-600 fill-current" />
                    Menos de $10
                  </h2>
                  <button
                    onClick={() => {
                      const el = document.getElementById('under10-carousel');
                      if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                    }}
                    className="text-blue-900 hover:text-blue-700 font-medium text-sm flex items-center"
                  >
                    Ver más <ChevronDown className="h-4 w-4 transform -rotate-90" />
                  </button>
                </div>

                <div className="relative group">
                  {/* Flecha Izquierda */}
                  <button
                    onClick={() => {
                      const el = document.getElementById('under10-carousel');
                      if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                    }}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-gray-800 z-10 hover:bg-white transition-all hidden md:block opacity-0 group-hover:opacity-100"
                  >
                    <ChevronDown className="h-6 w-6 transform rotate-90" />
                  </button>

                  {/* Contenedor Carrusel */}
                  <div
                    id="under10-carousel"
                    className="flex overflow-x-auto gap-4 py-2 px-1 snap-x scrollbar-hide scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {products
                      .filter(p => (p.salePrice2 || p.salePrice1 || p.originalPrice || 0) < 10)
                      .slice(0, 15) // Limitar a 15 productos
                      .map((product) => {
                        // Precio y descuento
                        let price = product.salePrice2 || product.salePrice1 || 0;
                        let originalPrice = product.originalPrice || 0;
                        let discountPercentage = 0;

                        if (originalPrice && originalPrice > price) {
                          discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
                        }

                        return (
                          <div
                            key={`under10-${product.id}`}
                            onClick={() => {
                              setSelectedProduct(product);
                              setCurrentImageIndex(0);
                              // Registrar vista (categoría)
                              if (user && product.category) {
                                userService.logProductView(user.uid, product.id, product.category);
                              }
                            }}
                            className="min-w-[200px] w-[200px] md:min-w-[220px] md:w-[220px] bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer snap-start flex-shrink-0 flex flex-col"
                          >
                            {/* Tags Flotantes */}
                            <div className="relative w-full h-40 bg-white p-2 flex items-center justify-center flex-shrink-0">
                              {product.origin === 'fivebelow' && (
                                <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">FB</span>
                              )}
                              {product.origin === 'walgreens' && (
                                <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">W</span>
                              )}
                              <span className="absolute bottom-2 right-2 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 border border-green-200">
                                Oferta
                              </span>
                              {discountPercentage > 0 && (
                                <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                                  -{discountPercentage}%
                                </span>
                              )}
                              {product.imageUrl ? (
                                <img
                                  src={getImageUrl(product.imageUrl)}
                                  alt={product.name}
                                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <Package className="h-10 w-10 text-gray-300" />
                              )}
                            </div>

                            <div className="p-3 bg-gray-50 flex-1 flex flex-col relative z-20">
                              <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1 h-10 leading-tight">
                                {product.name}
                              </h3>

                              <div className="mt-auto">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-lg font-bold text-green-700">${price.toFixed(2)}</span>
                                  {originalPrice > price && (
                                    <span className="text-xs text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(product, 'product');
                                  }}
                                  className="w-full mt-2 bg-white border border-green-600 text-green-700 hover:bg-green-600 hover:text-white text-xs font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer relative z-30"
                                >
                                  <ShoppingCart className="h-3 w-3" /> Agregar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Flecha Derecha */}
                  <button
                    onClick={() => {
                      const el = document.getElementById('under10-carousel');
                      if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                    }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-gray-800 z-10 hover:bg-white transition-all hidden md:block opacity-0 group-hover:opacity-100"
                  >
                    <ChevronDown className="h-6 w-6 transform -rotate-90" />
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Banner de Métodos de Pago */}
        <div className="container mx-auto px-4 mb-8">
          <div className="max-w-[1200px] mx-auto bg-blue-700 rounded-lg shadow-md p-3 text-white flex items-center justify-center gap-3">
            <CreditCard className="h-6 w-6" />
            <div className="text-center">
              <span className="text-lg font-bold">Haz tu compra con </span>
              <span className="text-lg font-medium">depósito bancario o transferencia en Ecuador</span>
            </div>
          </div>
        </div>

        {/* Sección de Productos */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-[1200px] mx-auto">
            {
              loading ? (
                <div className="flex items-center justify-center py-12" >
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('home.noProducts')}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? t('home.noProductsMessage') : t('home.noProductsAvailable')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.slice(0, visibleProducts).map(({ item }, index) => {
                      const product = item as Product;
                      const displayItem = product;

                      if (!displayItem) return null;

                      // Precio y descuento
                      let price = product.salePrice2 || product.salePrice1 || 0;
                      let originalPrice = product.originalPrice || 0;
                      let discountPercentage = 0;

                      if (originalPrice && originalPrice > price) {
                        // Descuento para productos regulares
                        discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
                      }

                      const isProduct = true;

                      // Para productos consolidados, verificar stock de las variantes
                      let isDisabled = false;
                      let stockInfo = '';
                      if (isProduct && product) {
                        if (product.isConsolidated && product.consolidatedProducts) {
                          // Verificar si al menos una variante tiene stock
                          const hasStock = product.consolidatedProducts.some(productId => {
                            return getAvailableQuantity(productId) > 0;
                          });
                          isDisabled = !hasStock && product.origin !== 'fivebelow' && product.origin !== 'walgreens';
                          // Contar variantes con stock
                          const variantsWithStock = product.consolidatedProducts.filter(productId => {
                            return getAvailableQuantity(productId) > 0;
                          }).length;
                          stockInfo = `${variantsWithStock}/${product.consolidatedProducts.length} ${t('home.variants')} ${t('home.available')}`;
                        } else {
                          // Producto normal - verificar stock directo
                          const availableQty = getAvailableQuantity(product.id);
                          // Permitir compra si es de Five Below o Walgreens aunque no tenga stock
                          if (product.origin === 'fivebelow' || product.origin === 'walgreens') {
                            isDisabled = false;
                            // Si hay stock real lo mostramos, si no (0) mostramos info de disponible pero sin cantidad
                            stockInfo = availableQty > 0
                              ? `${availableQty} ${t('home.available')}`
                              : 'Disponible';
                          } else {
                            isDisabled = availableQty === 0;
                            stockInfo = availableQty > 0 ? `${availableQty} ${t('home.available')}` : t('home.outOfStockLabel');
                          }
                        }
                      }

                      return (

                        <React.Fragment key={displayItem.id}>
                          <div
                            onClick={() => {
                              setSelectedProduct(displayItem);
                              setCurrentImageIndex(0);
                              // Registrar vista (categoría)
                              if (user && isProduct && displayItem.category) {
                                userService.logProductView(user.uid, displayItem.id, displayItem.category);
                              }
                            }}
                            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                          >
                            {/* Imagen */}
                            <div className="w-full h-48 bg-white flex items-center justify-center overflow-hidden relative">
                              {/* ... (código existente de imagen) ... */}
                              {isProduct && product?.origin === 'fivebelow' && (
                                <div className="absolute top-2 right-2 z-10 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-white">
                                  FB
                                </div>
                              )}
                              {isProduct && product?.origin === 'walgreens' && (
                                <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-white">
                                  W
                                </div>
                              )}
                              {displayItem.imageUrl ? (
                                <img
                                  src={getImageUrl(displayItem.imageUrl)}
                                  alt={displayItem.name}
                                  className="w-full h-full object-contain p-3 hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <Package className="h-12 w-12 text-gray-300" />
                              )}
                            </div>

                            {/* Información */}
                            <div className="p-3 flex flex-col flex-grow bg-gray-200">
                              {/* ... (código existente de contenido) ... */}
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1 mr-2">
                                  {displayItem.name}
                                </h3>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  {isProduct && product?.isConsolidated && (
                                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                                      {t('home.variants')}
                                    </span>
                                  )}
                                  {getProductLocation(product.id)?.toLowerCase().includes('ecuador') && (
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded whitespace-nowrap flex items-center gap-1 font-medium border border-green-200">
                                      <Truck className="h-3 w-3" /> 24h
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tallas disponibles */}
                              {/* ... (código existente variantes) ... */}
                              {isProduct && (
                                (() => {
                                  const variants = consolidatedVariantsMap.get(product.id) || [];
                                  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))).sort();

                                  if (sizes.length > 0) {
                                    return (
                                      <p className="text-xs text-blue-800 mb-2 font-medium">
                                        Tallas: {sizes.join(', ')}
                                      </p>
                                    );
                                  }

                                  if (variants.length > 0) {
                                    return (
                                      <p className="text-xs text-blue-800 mb-2 font-medium">
                                        Ver opciones ({variants.length})
                                      </p>
                                    );
                                  }

                                  return null;
                                })()
                              )}

                              {/* Información de stock */}
                              {isProduct && product && stockInfo && (
                                <p className={`text-xs mb-1 font-medium ${isDisabled ? 'text-red-600' : 'text-green-600'}`}>
                                  {stockInfo}
                                </p>
                              )}

                              {/* Precio */}
                              <div className="mt-auto">
                                <div className="mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-lg font-bold text-primary-600">
                                      ${price.toLocaleString()}
                                    </span>
                                    {originalPrice && originalPrice > 0 && originalPrice > price && (
                                      <>
                                        <span className="text-xs text-gray-500 line-through">
                                          ${originalPrice.toLocaleString()}
                                        </span>
                                        {discountPercentage > 0 && (
                                          <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">
                                            -{discountPercentage}% {t('home.discount')}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Botón agregar al carrito */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Si es consolidado, abrir modal de detalles para seleccionar variante
                                    if (product!.isConsolidated) {
                                      setSelectedProduct(product!);
                                      setCurrentImageIndex(0);
                                    } else {
                                      addToCart(product!, 'product');
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${!isDisabled
                                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  <span>
                                    {isDisabled
                                      ? t('home.outOfStock')
                                      : (isProduct && (product?.origin === 'fivebelow' || product?.origin === 'walgreens') && getAvailableQuantity(product.id) === 0)
                                        ? t('home.addToCartButton')
                                        : (isProduct && product?.isConsolidated)
                                          ? t('home.viewDetails')
                                          : t('home.addToCartButton')
                                    }
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                          {/* Insertar Banner Publicitario después del 12vo producto */}
                          {index === 11 && (
                            <div className="col-span-full my-6 bg-gray-900 rounded-lg shadow-md overflow-hidden h-20 relative group">
                              <AdvertCarousel />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  {/* Botón Ver Más */}
                  {visibleProducts < filteredProducts.length && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={() => setVisibleProducts(prev => prev + 24)}
                        className="px-8 py-3 bg-white border-2 border-primary-600 text-primary-600 font-bold rounded-full hover:bg-primary-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        Ver más productos <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )
            }
          </div>
        </div>

        {/* Sección de Estadísticas / Información Adicional */}
        <div className="container mx-auto px-4 py-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow border-b-4 border-blue-600">
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">+{products.length + perfumes.length} Productos</h3>
              <p className="text-gray-600">Amplia variedad de productos disponibles para ti en nuestro catálogo.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow border-b-4 border-yellow-500">
              <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Precios de Oferta en USA</h3>
              <p className="text-gray-600">Aprovecha los mejores precios y descuentos directos desde Estados Unidos.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow border-b-4 border-green-500">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Envíos Rápidos y Seguros</h3>
              <p className="text-gray-600">Garantizamos la entrega de tus compras de forma rápida y 100% segura.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow border-b-4 border-purple-500">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">+200 Clientes Satisfechos</h3>
              <p className="text-gray-600">Únete a nuestra comunidad de clientes felices que confían en nosotros.</p>
            </div>
          </div>
        </div>

        {/* Carrusel de Publicidad */}
        {storeSettings && (
          <AdvertisingCarousel banners={storeSettings.advertisingBanners} />
        )}

        {/* Modal de Detalles del Producto/Perfume */}
        {
          selectedProduct && (() => {
            const isProduct = 'salePrice1' in selectedProduct || 'salePrice2' in selectedProduct;
            const product = isProduct ? selectedProduct as Product : null;
            const perfume = !isProduct ? selectedProduct as Perfume : null;

            // Para perfumes, aplicar descuento global
            let price = product ? (product.salePrice2 || product.salePrice1) : (perfume?.price || 0);
            let originalPrice = product ? product.originalPrice : 0;
            let discountPercentage = 0;

            if (perfume && globalDiscount > 0) {
              // Aplicar descuento global a perfumes
              originalPrice = perfume.price;
              price = Math.round((perfume.price * (1 - globalDiscount / 100)) * 100) / 100;
              discountPercentage = globalDiscount;
            } else if (product && originalPrice && originalPrice > price) {
              // Descuento para productos regulares
              discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
            }

            // Obtener variantes si es un producto consolidado
            const consolidatedVariants = product
              ? (consolidatedVariantsMap.get(product.id) || [])
              : [];

            // Determinar si está deshabilitado
            let isDisabled = false;
            if (product) {
              if (product.isConsolidated) {
                // Si es consolidado, verificar si hay variante seleccionada y si tiene stock
                if (selectedVariant && selectedVariant.productId) {
                  // Permitir si es FB/WG aunque no tenga stock
                  if (product.origin === 'fivebelow' || product.origin === 'walgreens') {
                    isDisabled = false;
                  } else {
                    isDisabled = getAvailableQuantity(selectedVariant.productId) === 0;
                  }
                } else {
                  // Si no hay variante seleccionada, verificar si al menos una tiene stock O si es FB/WG
                  if (product.origin === 'fivebelow' || product.origin === 'walgreens') {
                    isDisabled = false;
                  } else {
                    isDisabled = !consolidatedVariants.some(v => getAvailableQuantity(v.id) > 0);
                  }
                }
              } else {
                // Si es Five Below, permitir aunque stock sea 0
                if (product.origin === 'fivebelow') {
                  isDisabled = false;
                } else {
                  isDisabled = getAvailableQuantity(product.id) === 0;
                }
              }
            }

            return (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedProduct(null)}
              >
                <div
                  className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6">
                    {/* Botón cerrar */}
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setSelectedVariant(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Imagen grande (Carousel) */}
                    <div className="w-full h-64 md:h-96 bg-gray-100 rounded-lg mb-4 relative overflow-hidden group">
                      {(() => {
                        const allImages = [
                          selectedProduct.imageUrl,
                          ...(isProduct && product?.images ? product.images : [])
                        ].filter(Boolean) as string[];

                        if (allImages.length === 0) {
                          return (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-24 w-24 text-gray-400" />
                            </div>
                          );
                        }

                        return (
                          <>
                            <img
                              src={getImageUrl(allImages[currentImageIndex])}
                              alt={selectedProduct.name}
                              className="w-full h-full object-contain transition-all duration-300"
                            />

                            {/* Flechas de navegación */}
                            {allImages.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ChevronDown className="h-6 w-6 rotate-90" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ChevronDown className="h-6 w-6 -rotate-90" />
                                </button>

                                {/* Indicadores (Puntos) */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                                  {allImages.map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentImageIndex(idx);
                                      }}
                                      className={`w-2 h-2 rounded-full transition-all ${currentImageIndex === idx ? 'bg-blue-600 w-4' : 'bg-gray-300'
                                        }`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Información */}
                    <div className="space-y-4">
                      {/* Nombre */}
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedProduct.name}
                      </h2>

                      {/* Marca (solo para perfumes) */}
                      {perfume && (
                        <div className="text-sm text-gray-600">
                          <strong>{t('home.brand')}:</strong> {perfume.brand}
                          {perfume.collection && <span className="ml-2">• <strong>{t('home.collection')}:</strong> {perfume.collection}</span>}
                        </div>
                      )}

                      {/* Precios */}
                      <div className="space-y-2">
                        {(isProduct || perfume) && originalPrice && originalPrice > 0 && originalPrice > price && (
                          <div className="flex items-center space-x-3">
                            <span className="text-xl text-gray-500 line-through">
                              ${originalPrice.toLocaleString()}
                            </span>
                            {discountPercentage > 0 && (
                              <span className="text-sm font-bold bg-red-500 text-white px-2 py-1 rounded">
                                -{discountPercentage}% {t('home.discount')}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-3xl font-bold text-primary-600">
                          ${price.toLocaleString()}
                        </div>
                      </div>

                      {/* Ubicación (solo para productos) */}
                      {product && getProductLocation(product.id) && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="h-5 w-5" />
                          <span className="text-sm">
                            {t('home.location')}: <strong>{getProductLocation(product.id)}</strong>
                          </span>
                        </div>
                      )}

                      {/* Descripción (solo para perfumes) */}
                      {perfume && (perfume.description || perfume.descriptionEs || perfume.descriptionEn) && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('home.description')}:</h3>
                          <div className="text-sm text-gray-600 prose prose-sm max-w-none">
                            {renderHTML(
                              language === 'es'
                                ? (perfume.descriptionEs || perfume.description || '')
                                : (perfume.descriptionEn || perfume.description || '')
                            )}
                          </div>
                        </div>
                      )}

                      {/* Descripción (para productos regulares) */}
                      {product && product.description && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('home.description')}:</h3>
                          <div className="text-sm text-gray-600 prose prose-sm max-w-none">
                            {renderHTML(product.description)}
                          </div>
                        </div>
                      )}

                      {/* Variantes para productos consolidados */}
                      {product && consolidatedVariants.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">{t('home.selectVariant')}</h3>

                          {/* Selección de Talla */}
                          {consolidatedVariants.some(v => v.size) && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('home.selectSize')}</label>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(consolidatedVariants.map(v => v.size).filter(Boolean))).map(size => {
                                  // Buscar todas las variantes con esta talla
                                  const variantsWithSize = consolidatedVariants.filter(v => v.size === size);
                                  const hasStock = variantsWithSize.some(v => getAvailableQuantity(v.id) > 0) || (product && (product.origin === 'fivebelow' || product.origin === 'walgreens'));
                                  const stockQty = variantsWithSize.reduce((sum, v) => sum + getAvailableQuantity(v.id), 0);

                                  return (
                                    <button
                                      key={size}
                                      onClick={() => {
                                        if (hasStock) {
                                          // Buscar un producto con esta talla que tenga stock OR is force-allowed
                                          const variantWithSize = consolidatedVariants.find(v =>
                                            v.size === size && (getAvailableQuantity(v.id) > 0 || v.origin === 'fivebelow' || v.origin === 'walgreens')
                                          );
                                          if (variantWithSize) {
                                            setSelectedVariant({
                                              productId: variantWithSize.id,
                                              size: size,
                                              color: variantWithSize.color
                                            });
                                          }
                                        }
                                      }}
                                      disabled={!hasStock}
                                      className={`px-4 py-2 rounded-lg border-2 transition-colors relative ${!hasStock
                                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                        : selectedVariant?.size === size
                                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                                          : 'border-gray-300 hover:border-primary-300'
                                        }`}
                                      title={!hasStock ? t('home.outOfStockLabel') : `${stockQty} ${t('home.available')}`}
                                    >
                                      {size}
                                      {!hasStock && (
                                        <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                          ×
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Selección de Color */}
                          {consolidatedVariants.some(v => v.color) && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">{t('home.selectColor')}</label>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(consolidatedVariants.map(v => v.color).filter(Boolean))).map(color => {
                                  // Buscar todas las variantes con este color (y talla si está seleccionada)
                                  const variantsWithColor = consolidatedVariants.filter(v =>
                                    v.color === color &&
                                    (!selectedVariant?.size || v.size === selectedVariant.size)
                                  );
                                  const hasStock = variantsWithColor.some(v => getAvailableQuantity(v.id) > 0) || (product && (product.origin === 'fivebelow' || product.origin === 'walgreens'));
                                  const stockQty = variantsWithColor.reduce((sum, v) => sum + getAvailableQuantity(v.id), 0);

                                  return (
                                    <button
                                      key={color}
                                      onClick={() => {
                                        if (hasStock) {
                                          // Buscar un producto con este color (y talla si está seleccionada) que tenga stock OR is force-allowed
                                          const variantWithColor = consolidatedVariants.find(v =>
                                            v.color === color &&
                                            (!selectedVariant?.size || v.size === selectedVariant.size) &&
                                            (getAvailableQuantity(v.id) > 0 || v.origin === 'fivebelow' || v.origin === 'walgreens')
                                          );
                                          if (variantWithColor) {
                                            setSelectedVariant({
                                              productId: variantWithColor.id,
                                              size: variantWithColor.size,
                                              color: color
                                            });
                                          }
                                        }
                                      }}
                                      disabled={!hasStock}
                                      className={`px-4 py-2 rounded-lg border-2 transition-colors relative ${!hasStock
                                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                        : selectedVariant?.color === color
                                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                                          : 'border-gray-300 hover:border-primary-300'
                                        }`}
                                      title={!hasStock ? t('home.outOfStockLabel') : `${stockQty} ${t('home.available')}`}
                                    >
                                      {color}
                                      {!hasStock && (
                                        <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                          ×
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Mostrar todas las variantes con su disponibilidad */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">{t('home.allVariants')}:</h4>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                              {consolidatedVariants.map(variant => {
                                const stock = getAvailableQuantity(variant.id);
                                const isAvailable = stock > 0 || variant.origin === 'fivebelow' || variant.origin === 'walgreens';
                                const isSelected = selectedVariant?.productId === variant.id;

                                return (
                                  <div
                                    key={variant.id}
                                    onClick={() => {
                                      if (isAvailable) {
                                        setSelectedVariant({
                                          productId: variant.id,
                                          size: variant.size,
                                          color: variant.color
                                        });
                                      }
                                    }}
                                    className={`p-2 rounded-lg border-2 transition-colors ${!isAvailable
                                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                      : isSelected
                                        ? 'border-primary-600 bg-primary-50 cursor-pointer'
                                        : 'border-gray-200 hover:border-primary-300 cursor-pointer'
                                      }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          {variant.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          {variant.size && (
                                            <span className="text-xs text-gray-600">{t('home.selectSize')}: {variant.size}</span>
                                          )}
                                          {variant.color && (
                                            <span className="text-xs text-gray-600">{t('home.selectColor')}: {variant.color}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        {isAvailable ? (
                                          <span className="text-xs font-medium text-green-600">
                                            {stock} {t('home.available')}
                                          </span>
                                        ) : (
                                          <span className="text-xs font-medium text-red-600">
                                            {t('home.outOfStockLabel')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mostrar variante seleccionada */}
                          {selectedVariant && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm text-green-800 font-medium">
                                {t('home.selectedVariant')}: {consolidatedVariants.find(v => v.id === selectedVariant.productId)?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                {t('home.stockAvailable')}: {getAvailableQuantity(selectedVariant.productId)} {t('home.units')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Botón agregar al carrito */}
                      <button
                        onClick={() => {
                          if (product) {
                            // Considerar consolidado si tiene flag o si se detectaron variantes
                            const isConsolidated = product.isConsolidated || consolidatedVariants.length > 0;

                            if (isConsolidated) {
                              if (selectedVariant && selectedVariant.productId) {
                                const variantProduct = products.find(p => p.id === selectedVariant.productId);
                                if (variantProduct) {
                                  addToCart(variantProduct, 'product');
                                }
                              } else {
                                toast.error(t('home.selectVariant'));
                                return;
                              }
                            } else {
                              addToCart(product, 'product');
                            }
                          } else if (perfume) {
                            addToCart(perfume, 'perfume');
                          }
                          setSelectedProduct(null);
                          setSelectedVariant(null);
                        }}
                        disabled={isDisabled || ((product?.isConsolidated || consolidatedVariants.length > 0) && !selectedVariant)}
                        className={`w-full py-3 rounded-lg text-base font-medium transition-colors flex items-center justify-center space-x-2 ${!isDisabled && !((product?.isConsolidated || consolidatedVariants.length > 0) && !selectedVariant)
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        <ShoppingCart className="h-5 w-5" />
                        <span>
                          {isDisabled
                            ? 'Sin Stock'
                            : ((product?.isConsolidated || consolidatedVariants.length > 0) && !selectedVariant)
                              ? t('home.selectVariant')
                              : (product?.origin === 'fivebelow' && getAvailableQuantity(product.id) === 0)
                                ? t('home.addToCartButton')
                                : t('home.addToCartButton')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        }

        {/* Footer */}
        <footer className="bg-blue-900 text-white mt-12 py-8 px-4 border-t border-blue-800">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Package className="h-6 w-6" />
                  <h3 className="text-lg font-bold">{t('home.footer.title')}</h3>
                </div>
                <p className="text-blue-200 text-sm">
                  {t('home.footer.description')}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('home.footer.links')}</h4>
                <ul className="space-y-2 text-sm text-blue-200">
                  <li>
                    <button onClick={() => navigate('/login')} className="hover:text-white">
                      {t('home.footer.login')}
                    </button>
                  </li>
                  <li>
                    <a href="#productos" className="hover:text-white">
                      {t('home.footer.products')}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">{t('home.footer.contact')}</h4>
                <p className="text-sm text-blue-200 mb-4">
                  {t('home.footer.description')}
                </p>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="bg-yellow-400 text-blue-900 px-6 py-2 rounded-full font-bold hover:bg-yellow-300 transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Escríbenos
                </button>
              </div>
            </div>
            <div className="border-t border-blue-800 mt-8 pt-8 text-center">
              <p className="font-bold text-lg text-white mb-2">Compras Express 2025</p>
              <p className="text-xs text-blue-200 uppercase tracking-wider">
                Potenciado y diseñado por <a href="https://freedomlabs.dev/" target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors">Freedom Labs</a>
              </p>
            </div>
          </div>
        </footer>

        {/* Modal del Carrito */}

        {
          showAddToCartPopup && (
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div className="bg-white rounded-lg shadow-2xl p-6 flex items-center space-x-3 animate-fade-in pointer-events-auto border-2 border-green-500">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <p className="text-lg font-semibold text-gray-900">{t('home.productAdded')}</p>
              </div>
            </div>
          )
        }


      </main >

      {/* Modal Address */}
      {showAddressModal && (
        <AddressModal
          onClose={() => setShowAddressModal(false)}
          onAddressSaved={handleAddressSaved}
        />
      )}

      {/* Modal de Contacto */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Contáctanos
            </h2>
            <p className="text-gray-500 mb-6 text-sm">Estamos aquí para ayudarte. Déjanos tu mensaje.</p>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={contactForm.phone}
                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="099 999 9999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea
                  required
                  value={contactForm.message}
                  onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  placeholder="Escribe tu mensaje o consulta aquí..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={sendingContact}
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {sendingContact ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Enviar Mensaje
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Invita y Gana (Wallet) */}
      {
        showReferralModal && user && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowReferralModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>

              <h2 className="text-2xl font-bold text-blue-900 mb-2 text-center flex items-center justify-center gap-2">
                <Wallet className="h-8 w-8 text-yellow-500" />
                Tu Wallet y Referidos
              </h2>
              <p className="text-gray-500 text-center mb-6 text-sm">Gestiona tus bonos y ganancias</p>

              {/* Wallet Display */}
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 text-white text-center mb-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <DollarSign className="h-24 w-24" />
                </div>

                <p className="text-blue-100 text-sm font-medium mb-1 uppercase tracking-wider">Saldo Disponible</p>
                <div className="text-5xl font-black flex items-center justify-center gap-1 mb-2 tracking-tight">
                  <span className="text-2xl opacity-60 mt-2">$</span>
                  <span>{walletBalance.toFixed(2)}</span>
                </div>

                {pendingBalance > 0 ? (
                  <div className="inline-block bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-full px-4 py-1">
                    <p className="text-xs text-yellow-300 font-bold">
                      + ${pendingBalance.toFixed(2)} Pendientes por activar ⏳
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-blue-200">Se usará automáticamente 20% en tus envíos</p>
                )}
              </div>

              {/* Link Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  ¡Gana $10 por cada amigo!
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-600 mb-3">
                    Comparte tu enlace único. Tus amigos reciben <strong>$10 de bono</strong> al registrarse, y tú recibes <strong>$10 extra</strong> cuando ellos hagan su primera compra.
                  </p>

                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-gray-300 rounded-lg overflow-hidden flex items-center">
                      <span className="bg-gray-100 border-r border-gray-300 px-3 py-2 text-gray-500 text-xs font-bold">LINK</span>
                      <input
                        type="text"
                        readOnly
                        value={referralLink}
                        className="flex-1 px-3 py-2 text-sm text-gray-600 focus:outline-none font-mono"
                      />
                    </div>
                    <button
                      onClick={copyLink}
                      className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center shadow-md active:transform active:scale-95"
                      title="Copiar enlace"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-xs text-gray-400">
                * Los bonos aplican como descuento del 20% sobre el valor del envío.
              </div>

              {/* Sección de Cupones */}
              <div className="mt-6 border-t pt-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                  <Ticket className="h-5 w-5 text-purple-600" />
                  Mis Cupones Disponibles
                </h3>

                {loadingCoupons ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : userCoupons.length > 0 ? (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {userCoupons.map((coupon) => (
                      <div key={coupon.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-purple-700">${coupon.amount} OFF</p>
                          <p className="text-xs text-gray-500">Compra mínima: ${coupon.minPurchase}</p>
                        </div>
                        <div className="bg-white px-2 py-1 rounded text-xs font-mono font-bold text-gray-600 border border-gray-200">
                          {coupon.code}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-gray-400 text-sm">No tienes cupones disponibles aún.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
      {
        showHowToBuy && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowHowToBuy(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>

              <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center">
                ¿Cómo comprar en Envíos Ecuador?
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-900 flex-shrink-0">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">1. Selecciona tu producto</h3>
                    <p className="text-gray-600 text-sm">Explora nuestro catálogo y agrega tus productos favoritos al carrito de compras.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-yellow-100 p-3 rounded-full text-yellow-600 flex-shrink-0">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">2. Realiza el pago</h3>
                    <p className="text-gray-600 text-sm">Paga fácil con <span className="font-semibold">Tarjeta de Crédito, Débito</span> o mediante <span className="font-semibold">Transferencia Bancaria en Ecuador</span>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-full text-green-600 flex-shrink-0">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">3. Recibe tu pedido</h3>
                    <p className="text-gray-600 text-sm">¡Eso es todo! Recibe tu compra en la comodidad de tu hogar en un plazo de <span className="font-bold">12 a 15 días</span>.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowHowToBuy(false)}
                  className="bg-blue-900 text-white px-8 py-2 rounded-full font-bold hover:bg-blue-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  ¡Entendido, quiero comprar!
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Pedido Exitoso */}
      {
        showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>

              <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-black text-gray-900 mb-3">¡Pedido Recibido!</h2>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-gray-700 text-sm leading-relaxed">
                  Su compra ha sido marcada como <span className="font-bold text-yellow-700 uppercase">PENDIENTE</span>.
                </p>
                <div className="my-2 border-t border-yellow-100"></div>
                <p className="text-gray-600 text-xs">
                  Confirmaremos su depósito en las próximas <strong className="text-gray-800">2 a 24 horas</strong>.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.reload();
                }}
                className="bg-blue-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 w-full transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg"
              >
                Entendido, volver a la tienda
              </button>
            </div>
          </div>
        )
      }
      {/* Mobile Menu Drawer */}
      {
        showMobileMenu && (
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
                    <button onClick={() => navigate('/login')} className="w-full bg-blue-900 text-white flex items-center justify-center gap-2 py-3 rounded-lg shadow-sm font-bold">
                      <User className="h-5 w-5" /> Iniciar Sesión
                    </button>
                  </div>
                )}

                <div className="space-y-1">
                  <button onClick={() => { setShowMobileMenu(false); setSelectedCategory('all'); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                    Todas las Categorías
                  </button>
                  <button onClick={() => { setShowMobileMenu(false); setShowHowToBuy(true); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                    Cómo Comprar
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
                      <button onClick={() => { setShowMobileMenu(false); setShowReferralModal(true); }} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 font-medium text-gray-700">
                        <Wallet className="h-5 w-5 text-green-500" /> Billetera (${walletBalance.toFixed(2)})
                      </button>
                      <div className="my-2 border-t border-gray-100"></div>
                      <button onClick={handleLogout} className="w-full text-left p-3 hover:bg-red-50 rounded-lg flex items-center gap-3 font-medium text-red-600">
                        <LogOut className="h-5 w-5" /> Cerrar Sesión
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Chat Bubble */}
      <ChatBubble />

      {/* Reward Game Modal */}
      <RewardGameModal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
      />
    </div >
  );
};

export default Home;

