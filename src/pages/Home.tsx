import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, Search, Menu, X, LogIn, Star, Truck, Shield, Heart, MapPin, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { onlineSaleService, OnlineSaleItem } from '../services/onlineSaleService';
import { perfumeService } from '../services/perfumeService';
import { perfumeSettingsService } from '../services/perfumeSettingsService';
import { useAuth } from '../hooks/useAuth';
import { Product, InventoryItem, Perfume } from '../types';
import { getImageUrl } from '../utils/imageUtils';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isSeller } = useAuth();
  const { t, language } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponActive, setCouponActive] = useState(false);
  const [enteredCouponCode, setEnteredCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(false);
  const [showAddToCartPopup, setShowAddToCartPopup] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<{ productId: string; size?: string; color?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [cart, setCart] = useState<Array<{ product?: Product; perfume?: Perfume; quantity: number; type: 'product' | 'perfume' }>>([]);
  const [showCart, setShowCart] = useState(false);
  const [processingSale, setProcessingSale] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | Perfume | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'banco_pichincha' | 'paypal' | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });

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
    // Si es vendedor autenticado, redirigir a su panel
    if (user && isSeller) {
      navigate('/dashboard');
      return;
    }
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSeller, navigate]);

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
    { key: 'Vitaminas', label: t('home.vitamins') },
    { key: 'Perfumes', label: t('home.perfumes') }
  ];

  // Obtener todas las marcas únicas de perfumes
  const perfumeBrands = Array.from(new Set(perfumes.map(p => p.brand).filter(Boolean))).sort();

  // Combinar productos y perfumes para mostrar en la tienda y mezclar aleatoriamente
  const allItems = useMemo(() => {
    // Debug: mostrar categorías únicas de productos
    if (products.length > 0) {
      const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
      console.log('📦 Categorías únicas de productos:', uniqueCategories);
    }
    return shuffleArray([
      ...products.map(p => ({ type: 'product' as const, item: p })),
      ...perfumes.map(p => ({ type: 'perfume' as const, item: p }))
    ]);
  }, [products, perfumes, shuffleArray]);

  const filteredProducts = allItems.filter(({ type, item }) => {
    const product = type === 'product' ? item as Product : null;
    const perfume = type === 'perfume' ? item as Perfume : null;
    
    if (perfume) {
      // Para perfumes - solo mostrar si la categoría es 'Perfumes' o 'all'
      if (selectedCategory !== 'all' && selectedCategory !== 'Perfumes') {
        return false;
      }
      
      const matchesSearch = 
        perfume.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perfume.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perfume.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBrand = selectedBrand === 'all' || perfume.brand === selectedBrand;
      
      return matchesSearch && matchesBrand;
    }
    
    if (product) {
      // Para productos regulares - no mostrar si la categoría es 'Perfumes'
      if (selectedCategory === 'Perfumes') {
        return false;
      }
      
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Comparación flexible de categoría (case-insensitive y normalizada)
      // Normalizar ambas categorías para comparar
      const normalizeCategory = (cat: string) => cat.trim().toLowerCase().replace(/\s+/g, ' ');
      const matchesCategory = selectedCategory === 'all' || 
        (product.category && normalizeCategory(product.category) === normalizeCategory(selectedCategory));
      
      // No mostrar productos que son parte de un consolidado (solo mostrar el consolidado)
      if (product.parentConsolidatedId) {
        return false;
      }
      
      // Mostrar todos los productos, incluso sin stock
      return matchesSearch && matchesCategory;
    }
    
    return false;
  });

  const addToCart = (item: Product | Perfume, type: 'product' | 'perfume' = 'product') => {
    if (type === 'product') {
      const product = item as Product;
      const availableQty = getAvailableQuantity(product.id);
      const existingItem = cart.find(cartItem => cartItem.type === 'product' && cartItem.product?.id === product.id);
      const currentCartQty = existingItem ? existingItem.quantity : 0;
      
      if (currentCartQty >= availableQty) {
        toast.error(`${t('home.stockAvailable')}: ${availableQty} ${t('home.units')}`);
        return;
      }
      
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
    
    // Mostrar popup
    setShowAddToCartPopup(true);
    setTimeout(() => {
      setShowAddToCartPopup(false);
    }, 3000);
  };

  const removeFromCart = (itemId: string, type: 'product' | 'perfume') => {
    setCart(cart.filter(cartItem => {
      if (type === 'product') {
        return !(cartItem.type === 'product' && cartItem.product?.id === itemId);
      } else {
        return !(cartItem.type === 'perfume' && cartItem.perfume?.id === itemId);
      }
    }));
    toast.success('Item removido del carrito');
  };

  const updateCartQuantity = (itemId: string, quantity: number, type: 'product' | 'perfume') => {
    if (quantity <= 0) {
      removeFromCart(itemId, type);
      return;
    }
    
    if (type === 'product') {
      const availableQty = getAvailableQuantity(itemId);
      if (quantity > availableQty) {
        toast.error(`${t('home.stockAvailable')}: ${availableQty} ${t('home.units')}`);
        return;
      }
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

  // Calcular subtotal de perfumes (con descuento global)
  const perfumeSubtotal = cart.reduce((sum, item) => {
    if (item.type === 'perfume' && item.perfume) {
      const perfumePrice = globalDiscount > 0
        ? Math.round((item.perfume.price * (1 - globalDiscount / 100)) * 100) / 100
        : item.perfume.price;
      return sum + (perfumePrice * item.quantity);
    }
    return sum;
  }, 0);

  // Calcular subtotal de productos
  const productSubtotal = cart.reduce((sum, item) => {
    if (item.type === 'product' && item.product) {
      return sum + ((item.product.salePrice2 || item.product.salePrice1) * item.quantity);
    }
    return sum;
  }, 0);

  // Aplicar cupón si está activo y el código coincide
  const couponDiscountAmount = (appliedCoupon && couponActive && enteredCouponCode.toUpperCase() === couponCode.toUpperCase() && couponCode)
    ? Math.round((perfumeSubtotal * (couponDiscount / 100)) * 100) / 100
    : 0;

  const cartTotal = productSubtotal + perfumeSubtotal - couponDiscountAmount;
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePaymentMethodSelect = (method: 'banco_pichincha' | 'paypal') => {
    if (!customerInfo.name || !customerInfo.lastName || !customerInfo.phone || !customerInfo.email || !customerInfo.address) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    setSelectedPaymentMethod(method);
    if (method === 'banco_pichincha') {
      setShowCheckoutModal(false);
      setShowBankModal(true);
    } else {
      // Para PayPal, procesar directamente
      handleCheckout('paypal');
    }
  };

  const handleCheckout = async (paymentMethod: 'banco_pichincha' | 'paypal' = 'banco_pichincha', receiptUrl?: string) => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    // Separar productos y perfumes
    const productItems = cart.filter(item => item.type === 'product' && item.product);
    const perfumeItems = cart.filter(item => item.type === 'perfume' && item.perfume);

    // Validar stock disponible solo para productos regulares
    for (const item of productItems) {
      if (!item.product) continue;
      const availableQty = getAvailableQuantity(item.product.id);
      if (item.quantity > availableQty) {
        toast.error(`${t('home.stockAvailable')}: ${availableQty} ${t('home.units')} - ${item.product.name}`);
        return;
      }
    }

    try {
      setProcessingSale(true);

      // Crear items de venta solo para productos regulares (los perfumes se manejan por pedido)
      const saleItems: OnlineSaleItem[] = productItems
        .filter(item => item.product)
        .map(item => {
          const product = item.product!;
          const location = getProductLocation(product.id) || 'Bodega USA';
          return {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: item.quantity,
            unitPrice: product.salePrice2 || product.salePrice1,
            totalPrice: (product.salePrice2 || product.salePrice1) * item.quantity,
            location
          };
        });

      // Si hay perfumes, agregar nota
      const perfumeNote = perfumeItems.length > 0
        ? `\n\nPerfumes incluidos (${perfumeItems.length}):\n${perfumeItems.map(item => 
            `- ${item.perfume?.name} (${item.quantity}x) - $${(() => {
              const perfumePrice = globalDiscount > 0 && item.perfume
                ? Math.round((item.perfume.price * (1 - globalDiscount / 100)) * 100) / 100
                : (item.perfume?.price || 0);
              return (perfumePrice * item.quantity).toLocaleString();
            })()}`
          ).join('\n')}`
        : '';

      // Nota del cupón si fue aplicado
      const couponNote = appliedCoupon && couponDiscountAmount > 0
        ? `\n\nCupón aplicado: ${couponCode} (${couponDiscount}% de descuento) - Descuento: $${couponDiscountAmount.toLocaleString()}`
        : '';

      // Crear la venta
      const saleNumber = `VENTA-${Date.now()}`;
      const sale = {
        number: saleNumber,
        items: saleItems,
        totalAmount: cartTotal,
        customerName: `${customerInfo.name} ${customerInfo.lastName}`.trim() || 'Cliente en línea',
        customerEmail: customerInfo.email || '',
        customerPhone: customerInfo.phone || '',
        customerAddress: customerInfo.address || '',
        status: 'confirmed' as const,
        paymentMethod: paymentMethod,
        receiptUrl: receiptUrl || '',
        notes: `Venta realizada desde tienda en línea${perfumeNote}${couponNote}`,
        createdAt: new Date()
      };

      await onlineSaleService.create(sale);

      // Limpiar carrito
      setCart([]);
      setCustomerInfo({ name: '', lastName: '', email: '', phone: '', address: '' });
      setShowCart(false);
      setShowCheckoutModal(false);

      toast.success(`¡Pedido confirmado! Número: ${saleNumber}`);
      
      // Recargar productos para actualizar inventario
      await loadProducts();
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Error al procesar el pedido');
    } finally {
      setProcessingSale(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile-First */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo y nombre */}
            <div className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-primary-600" />
              <h1 className="text-lg font-bold text-gray-900">{t('home.title')}</h1>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center space-x-2">
              {/* Carrito */}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>

              {/* Selector de idioma */}
              <LanguageSelector />

              {/* Login */}
              <button
                onClick={() => navigate('/login')}
                className="flex items-center space-x-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t('home.footer.login')}</span>
              </button>

              {/* Menú móvil */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-600 hover:text-gray-900 md:hidden"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Menú móvil desplegable */}
          {showMobileMenu && (
            <div className="mt-4 pb-4 border-t border-gray-200">
              <nav className="flex flex-col space-y-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setShowMobileMenu(false);
                  }}
                  className="text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  {t('home.allCategories')}
                </button>
                {mainCategories.map(category => (
                  <button
                    key={category.key}
                    onClick={() => {
                      setSelectedCategory(category.key);
                      setSelectedBrand('all');
                      setShowMobileMenu(false);
                    }}
                    className="text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    {category.label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Barra de búsqueda */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Pestañas de filtros de categoría principal */}
        <div className="px-4 pb-3">
          <div className="flex space-x-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedBrand('all');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('home.allCategories')}
            </button>
            {mainCategories.map(category => (
              <button
                key={category.key}
                onClick={() => {
                  setSelectedCategory(category.key);
                  setSelectedBrand('all');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros de marcas de perfumes - solo se muestran cuando se selecciona "Perfumes" */}
        {selectedCategory === 'Perfumes' && perfumeBrands.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-xs font-medium text-gray-600 mb-2">{t('home.brand')}:</p>
            <div className="flex space-x-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedBrand('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedBrand === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {perfumeBrands.map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedBrand === brand
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-4 md:py-5 px-4 overflow-hidden">
        {/* Efectos de fondo animados */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        {/* Patrón de puntos decorativos */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="relative max-w-7xl mx-auto text-center z-10">
          {/* Contenido compacto */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
            {/* Título y precio en línea */}
            <div className="flex-1">
              <h2 className="text-base md:text-lg lg:text-xl font-bold mb-1 leading-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-yellow-200 to-white">
                  Compra en nuestra tienda y recíbelo en la puerta de tu casa
                </span>
              </h2>
              <div className="inline-flex items-center space-x-1.5 bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-3 py-1 border border-white border-opacity-30">
                <Star className="h-3 w-3 text-yellow-300" />
                <p className="text-xs md:text-sm font-semibold">
                  Solo por <span className="text-yellow-300 font-bold text-base md:text-lg">$6</span> la libra
                </p>
                <Star className="h-3 w-3 text-yellow-300" />
              </div>
            </div>
            
            {/* Badges compactos */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center space-x-1 bg-white bg-opacity-15 backdrop-blur-sm rounded-full px-2 py-1 border border-white border-opacity-20">
                <Truck className="h-3 w-3" />
                <span className="text-xs font-medium hidden sm:inline">Rápido</span>
              </div>
              <div className="flex items-center space-x-1 bg-white bg-opacity-15 backdrop-blur-sm rounded-full px-2 py-1 border border-white border-opacity-20">
                <Shield className="h-3 w-3" />
                <span className="text-xs font-medium hidden sm:inline">Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Productos */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(({ type, item }) => {
              const product = type === 'product' ? item as Product : null;
              const perfume = type === 'perfume' ? item as Perfume : null;
              const displayItem = product || perfume;
              
              if (!displayItem) return null;
              
              // Para perfumes, aplicar descuento global
              let price = product ? (product.salePrice2 || product.salePrice1 || 0) : (perfume?.price || 0);
              let originalPrice = product ? (product.originalPrice || 0) : 0;
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
              
              const isProduct = type === 'product';
              
              // Para productos consolidados, verificar stock de las variantes
              let isDisabled = false;
              let stockInfo = '';
              if (isProduct && product) {
                if (product.isConsolidated && product.consolidatedProducts) {
                  // Verificar si al menos una variante tiene stock
                  const hasStock = product.consolidatedProducts.some(productId => {
                    return getAvailableQuantity(productId) > 0;
                  });
                  isDisabled = !hasStock;
                  // Contar variantes con stock
                  const variantsWithStock = product.consolidatedProducts.filter(productId => {
                    return getAvailableQuantity(productId) > 0;
                  }).length;
                  stockInfo = `${variantsWithStock}/${product.consolidatedProducts.length} ${t('home.variants')} ${t('home.available')}`;
                } else {
                  // Producto normal - verificar stock directo
                  const availableQty = getAvailableQuantity(product.id);
                  isDisabled = availableQty === 0;
                  stockInfo = availableQty > 0 ? `${availableQty} ${t('home.available')}` : t('home.outOfStockLabel');
                }
              }
              
              return (
                <div
                  key={displayItem.id}
                  onClick={() => setSelectedProduct(displayItem)}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                >
                  {/* Imagen */}
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {displayItem.imageUrl ? (
                      <img
                        src={getImageUrl(displayItem.imageUrl)}
                        alt={displayItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-gray-400" />
                    )}
                  </div>

                  {/* Información */}
                  <div className="p-3 flex flex-col flex-grow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 flex-1">
                        {displayItem.name}
                      </h3>
                      {isProduct && product?.isConsolidated && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                          {t('home.variants')}
                        </span>
                      )}
                    </div>
                    {perfume && (
                      <p className="text-xs text-gray-500 mb-1">{perfume.brand}</p>
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
                          if (isProduct) {
                            // Si es consolidado, abrir modal de detalles para seleccionar variante
                            if (product!.isConsolidated) {
                              setSelectedProduct(product!);
                            } else {
                              addToCart(product!, 'product');
                            }
                          } else {
                            addToCart(perfume!, 'perfume');
                          }
                        }}
                        disabled={isDisabled}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
                          !isDisabled
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>
                          {isDisabled 
                            ? t('home.outOfStock') 
                            : (isProduct && product?.isConsolidated)
                            ? t('home.viewDetails')
                            : t('home.addToCartButton')
                          }
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Detalles del Producto/Perfume */}
      {selectedProduct && (() => {
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
        const consolidatedVariants = product?.isConsolidated && product.consolidatedProducts
          ? products.filter(p => product.consolidatedProducts!.includes(p.id))
          : [];
        
        // Determinar si está deshabilitado
        let isDisabled = false;
        if (product) {
          if (product.isConsolidated) {
            // Si es consolidado, verificar si hay variante seleccionada y si tiene stock
            if (selectedVariant && selectedVariant.productId) {
              isDisabled = getAvailableQuantity(selectedVariant.productId) === 0;
            } else {
              // Si no hay variante seleccionada, verificar si al menos una tiene stock
              isDisabled = !consolidatedVariants.some(v => getAvailableQuantity(v.id) > 0);
            }
          } else {
            isDisabled = getAvailableQuantity(product.id) === 0;
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

                {/* Imagen grande */}
                <div className="w-full h-64 md:h-96 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={getImageUrl(selectedProduct.imageUrl)}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Package className="h-24 w-24 text-gray-400" />
                  )}
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
                  {product && product.isConsolidated && consolidatedVariants.length > 0 && (
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
                              const hasStock = variantsWithSize.some(v => getAvailableQuantity(v.id) > 0);
                              const stockQty = variantsWithSize.reduce((sum, v) => sum + getAvailableQuantity(v.id), 0);
                              
                              return (
                                <button
                                  key={size}
                                  onClick={() => {
                                    if (hasStock) {
                                      // Buscar un producto con esta talla que tenga stock
                                      const variantWithSize = consolidatedVariants.find(v => 
                                        v.size === size && getAvailableQuantity(v.id) > 0
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
                                  className={`px-4 py-2 rounded-lg border-2 transition-colors relative ${
                                    !hasStock
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
                              const hasStock = variantsWithColor.some(v => getAvailableQuantity(v.id) > 0);
                              const stockQty = variantsWithColor.reduce((sum, v) => sum + getAvailableQuantity(v.id), 0);
                              
                              return (
                                <button
                                  key={color}
                                  onClick={() => {
                                    if (hasStock) {
                                      // Buscar un producto con este color (y talla si está seleccionada) que tenga stock
                                      const variantWithColor = consolidatedVariants.find(v => 
                                        v.color === color &&
                                        (!selectedVariant?.size || v.size === selectedVariant.size) &&
                                        getAvailableQuantity(v.id) > 0
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
                                  className={`px-4 py-2 rounded-lg border-2 transition-colors relative ${
                                    !hasStock
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
                            const isAvailable = stock > 0;
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
                                className={`p-2 rounded-lg border-2 transition-colors ${
                                  !isAvailable
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
                        // Si es consolidado y hay variante seleccionada, agregar la variante
                        if (product.isConsolidated && selectedVariant && selectedVariant.productId) {
                          const variantProduct = products.find(p => p.id === selectedVariant.productId);
                          if (variantProduct) {
                            addToCart(variantProduct, 'product');
                          }
                        } else if (!product.isConsolidated) {
                          addToCart(product, 'product');
                        } else {
                          toast.error(t('home.selectVariant'));
                          return;
                        }
                      } else if (perfume) {
                        addToCart(perfume, 'perfume');
                      }
                      setSelectedProduct(null);
                      setSelectedVariant(null);
                    }}
                    disabled={isDisabled || (product?.isConsolidated && !selectedVariant)}
                    className={`w-full py-3 rounded-lg text-base font-medium transition-colors flex items-center justify-center space-x-2 ${
                      !isDisabled && !(product?.isConsolidated && !selectedVariant)
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>
                      {isDisabled 
                        ? 'Sin Stock' 
                        : (product?.isConsolidated && !selectedVariant)
                        ? t('home.selectVariant')
                        : t('home.addToCartButton')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Package className="h-6 w-6" />
                <h3 className="text-lg font-bold">{t('home.footer.title')}</h3>
              </div>
              <p className="text-gray-400 text-sm">
                {t('home.footer.description')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('home.footer.links')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
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
              <p className="text-sm text-gray-400">
                {t('home.footer.description')}
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {t('home.footer.title')}. {t('home.footer.rights')}.</p>
          </div>
        </div>
      </footer>

      {/* Modal del Carrito */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-t-lg sm:rounded-lg shadow-xl">
            {/* Header del carrito */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{t('home.cart')}</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items del carrito */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('home.cartEmpty')}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t('home.addToCart')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const displayItem = item.product || item.perfume;
                    if (!displayItem) return null;
                    
                    const price = item.product 
                      ? (item.product.salePrice2 || item.product.salePrice1)
                      : (item.perfume && globalDiscount > 0
                          ? Math.round((item.perfume.price * (1 - globalDiscount / 100)) * 100) / 100
                          : (item.perfume?.price || 0));
                    const itemId = item.product?.id || item.perfume?.id || '';
                    
                    return (
                      <div key={`${item.type}-${itemId}`} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          {displayItem.imageUrl ? (
                            <img
                              src={getImageUrl(displayItem.imageUrl)}
                              alt={displayItem.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {displayItem.name}
                          </h4>
                          {item.perfume && (
                            <p className="text-xs text-gray-500">{item.perfume.brand}</p>
                          )}
                          {item.perfume && globalDiscount > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500 line-through">
                                ${item.perfume.price.toLocaleString()}
                              </span>
                              <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">
                                -{globalDiscount}%
                              </span>
                            </div>
                          ) : null}
                          <p className="text-sm text-gray-900 font-medium">
                            ${price.toLocaleString()} c/u
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={() => updateCartQuantity(itemId, item.quantity - 1, item.type)}
                              className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="text-sm font-medium text-gray-900 w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(itemId, item.quantity + 1, item.type)}
                              className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ${(price * item.quantity).toLocaleString()}
                          </p>
                          {item.product && (
                            <p className="text-xs text-gray-500">
                              {getProductLocation(item.product.id) || t('home.location')}
                            </p>
                          )}
                          {item.perfume && (
                            <p className="text-xs text-blue-500">{t('home.checkout')}</p>
                          )}
                          <button
                            onClick={() => removeFromCart(itemId, item.type)}
                            className="text-red-500 hover:text-red-700 text-sm mt-1"
                          >
                            {t('common.remove')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer del carrito */}
            {cart.length > 0 && (
              <div className="border-t p-4 bg-gray-50">
                {/* Campo de Cupón */}
                {couponActive && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 mb-2">{t('home.couponCode')}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={enteredCouponCode}
                        onChange={(e) => {
                          setEnteredCouponCode(e.target.value.toUpperCase());
                          setAppliedCoupon(false);
                        }}
                        placeholder={t('home.enterCoupon')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                      <button
                        onClick={() => {
                          if (enteredCouponCode.toUpperCase() === couponCode.toUpperCase() && couponCode) {
                            setAppliedCoupon(true);
                            toast.success(`Cupón aplicado: ${couponDiscount}% de descuento`);
                          } else {
                            setAppliedCoupon(false);
                            toast.error('Código de cupón inválido');
                          }
                        }}
                        disabled={!enteredCouponCode || appliedCoupon}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {appliedCoupon ? t('common.confirm') : t('home.applyCoupon')}
                      </button>
                    </div>
                    {appliedCoupon && (
                      <p className="text-xs text-green-700 mt-2 font-medium">
                        ✓ {t('home.couponApplied')}: {couponDiscount}% {t('home.discount')} {t('home.perfumes').toLowerCase()}
                      </p>
                    )}
                  </div>
                )}

                {/* Resumen de Totales */}
                <div className="mb-4 space-y-2">
                  {perfumeSubtotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('home.perfumeSubtotal')}:</span>
                      <span className="text-gray-900 font-medium">${perfumeSubtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {productSubtotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('home.productSubtotal')}:</span>
                      <span className="text-gray-900 font-medium">${productSubtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {appliedCoupon && couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('home.couponDiscount')} ({couponDiscount}%):</span>
                      <span className="font-medium">-${couponDiscountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>{t('home.cartTotal')}:</span>
                    <span className="text-primary-600">${cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                {!user ? (
                  <button
                    onClick={() => {
                      toast(t('home.loginToCheckout'), {
                        icon: 'ℹ️',
                      });
                      setShowCart(false);
                      navigate('/login');
                    }}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    {t('home.footer.login')} {t('home.checkout')}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCheckoutModal(true)}
                    disabled={cart.length === 0}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{t('home.checkout')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popup de Producto Agregado al Carrito */}
      {showAddToCartPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl p-6 flex items-center space-x-3 animate-fade-in pointer-events-auto border-2 border-green-500">
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
            <p className="text-lg font-semibold text-gray-900">{t('home.productAdded')}</p>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{t('home.checkout')}</h2>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario de Información del Cliente */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('home.customerInfo')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('home.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={t('home.name')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('home.lastName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={t('home.lastName')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={t('home.phone')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.email')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={t('home.email')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('home.address')} *
                  </label>
                  <textarea
                    required
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={t('home.address')}
                    rows={3}
                  />
                </div>
              </div>

              {/* Resumen del Pedido */}
              <div className="border-t pt-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Pedido</h3>
                <div className="space-y-2">
                  {perfumeSubtotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal Perfumes:</span>
                      <span className="text-gray-900 font-medium">${perfumeSubtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {productSubtotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal Productos:</span>
                      <span className="text-gray-900 font-medium">${productSubtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {appliedCoupon && couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento por Cupón ({couponDiscount}%):</span>
                      <span className="font-medium">-${couponDiscountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-primary-600">${cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Botones de Pago */}
              <div className="space-y-3">
                <button
                  onClick={() => handlePaymentMethodSelect('banco_pichincha')}
                  disabled={processingSale || cart.length === 0}
                  className="w-full bg-yellow-600 text-white py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('home.payWithBank')}</span>
                </button>
                
                <button
                  onClick={() => handlePaymentMethodSelect('paypal')}
                  disabled={processingSale || cart.length === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('home.payWithPayPal')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Banco Pichincha */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Pago con Banco Pichincha</h2>
                <button
                  onClick={() => {
                    setShowBankModal(false);
                    setShowCheckoutModal(true);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Información de la cuenta */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Datos para Transferencia/Depósito</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t('home.accountNumber')}:</p>
                    <p className="text-lg font-bold text-gray-900">2101234567890</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t('home.accountName')}:</p>
                    <p className="text-lg font-bold text-gray-900">ENVIOS ECUADOR S.A.</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t('home.accountType')}:</p>
                    <p className="text-base text-gray-900">{t('home.current')}</p>
                  </div>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  {t('home.transferInstructions')} <strong className="text-gray-900">${cartTotal.toLocaleString()}</strong> {t('home.uploadReceiptLabel')}.
                </p>
              </div>

              {/* Campo para subir recibo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('home.uploadReceipt')} *
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validar tamaño (máximo 5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error(t('home.fileTooLarge'));
                        return;
                      }
                      setReceiptFile(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                />
                {receiptFile && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('home.fileSelected')}: {receiptFile.name}
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowBankModal(false);
                    setShowCheckoutModal(true);
                  }}
                  className="flex-1 btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    if (!receiptFile) {
                      toast.error(t('home.pleaseUploadReceipt'));
                      return;
                    }

                    try {
                      setUploadingReceipt(true);
                      
                      // Subir archivo a Firebase Storage
                      const timestamp = Date.now();
                      const fileName = `receipts/${timestamp}_${receiptFile.name}`;
                      const storageRef = ref(storage, fileName);
                      
                      await uploadBytes(storageRef, receiptFile);
                      const receiptUrl = await getDownloadURL(storageRef);
                      
                      // Procesar el checkout con la URL del recibo
                      await handleCheckout('banco_pichincha', receiptUrl);
                      
                      toast.success(t('home.receiptUploaded'));
                    } catch (error) {
                      console.error('Error uploading receipt:', error);
                      toast.error(t('home.receiptUploadError'));
                    } finally {
                      setUploadingReceipt(false);
                    }
                  }}
                  disabled={!receiptFile || uploadingReceipt || processingSale}
                  className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {uploadingReceipt || processingSale ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{uploadingReceipt ? t('home.uploading') : t('home.processing')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>{t('home.confirmPayment')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

