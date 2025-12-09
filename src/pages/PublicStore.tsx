import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Store, X, ShoppingCart, Plus, Minus, Trash2, Flag } from 'lucide-react';
import { sellerStoreService } from '../services/sellerStoreService';
import { sellerService } from '../services/sellerService';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import toast from 'react-hot-toast';

interface CartItem {
  storeProductId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  availableStock?: number;
}

const PublicStore: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [availableSellers, setAvailableSellers] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Mostrar mensaje inicial
  useEffect(() => {
    console.log('🚀 PublicStore componente montado');
    console.log('📱 Slug de URL:', slug);
    console.log('🌐 URL completa:', window.location.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStoreData = useCallback(async () => {
    if (!slug) {
      console.error('❌ No slug provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log('🚀 Iniciando carga de tienda para slug:', slug);
      console.log('📱 User Agent:', navigator.userAgent);
      console.log('🌐 URL:', window.location.href);
      
      // Buscar vendedor por slug
      console.log('🔍 Paso 1: Buscando por slug:', slug);
      let sellerData = await sellerService.getBySlug(slug);
      console.log('Resultado búsqueda por slug:', sellerData ? '✅ Encontrado' : '❌ No encontrado');
      
      // Si no se encuentra por slug, intentar buscar por nombre
      if (!sellerData) {
        console.log('🔍 Paso 2: No se encontró por slug, intentando buscar por nombre:', slug);
        sellerData = await sellerService.getByName(slug);
        console.log('Resultado búsqueda por nombre:', sellerData ? '✅ Encontrado' : '❌ No encontrado');
      }
      
      // Si aún no se encuentra, intentar buscar por ID (para compatibilidad)
      if (!sellerData) {
        console.log('🔍 Paso 3: No se encontró por nombre, intentando buscar por ID:', slug);
        sellerData = await sellerService.getById(slug);
        console.log('Resultado búsqueda por ID:', sellerData ? '✅ Encontrado' : '❌ No encontrado');
      }
      
      if (!sellerData) {
        console.error('❌ Vendedor no encontrado con slug/nombre/ID:', slug);
        console.log('📋 Obteniendo todos los vendedores para debug...');
        try {
          const allSellers = await sellerService.getAll();
          console.log('📋 Total vendedores en Firestore:', allSellers.length);
          console.log('📋 Vendedores disponibles:', allSellers.map(s => ({ 
            name: s.name, 
            slug: s.slug || '❌ sin slug', 
            id: s.id,
            email: s.email
          })));
          
          // Buscar si hay algún vendedor que coincida con "luis"
          const matchingSellers = allSellers.filter(s => {
            const nameLower = s.name.toLowerCase();
            const slugLower = (s.slug || '').toLowerCase();
            return nameLower.includes('luis') || slugLower.includes('luis');
          });
          
          // Guardar información de debug para mostrar en la página
          setDebugInfo({
            slugBuscado: slug,
            totalVendedores: allSellers.length,
            vendedores: allSellers.map(s => ({
              name: s.name,
              slug: s.slug || 'sin slug',
              id: s.id
            })),
            coincidencias: matchingSellers.map(s => ({
              name: s.name,
              slug: s.slug || 'sin slug',
              id: s.id
            }))
          });
          
          if (matchingSellers.length > 0) {
            console.log('🎯 Vendedores que coinciden con "luis":', matchingSellers.map(s => ({
              name: s.name,
              slug: s.slug,
              id: s.id
            })));
          }
        } catch (debugError) {
          console.error('Error obteniendo vendedores para debug:', debugError);
          setDebugInfo({
            error: 'Error al obtener vendedores',
            mensaje: debugError instanceof Error ? debugError.message : 'Error desconocido'
          });
        }
        setLoading(false);
        return;
      }
      
      // Si el vendedor existe pero no tiene slug, generarlo
      if (sellerData && !sellerData.slug) {
        console.log('Vendedor encontrado pero sin slug, generando slug...');
        try {
          await sellerService.generateMissingSlugs();
          const updatedSeller = await sellerService.getById(sellerData.id);
          if (updatedSeller) {
            sellerData = updatedSeller;
            console.log('Slug generado:', updatedSeller.slug);
          }
        } catch (error) {
          console.error('Error generando slug:', error);
        }
      }
      
      console.log('Vendedor encontrado:', {
        id: sellerData.id,
        name: sellerData.name,
        slug: sellerData.slug
      });
      
      // Cargar productos de la tienda usando el ID del vendedor
      console.log('========================================');
      console.log('📦 CARGANDO PRODUCTOS DE LA TIENDA');
      console.log('========================================');
      console.log('Vendedor ID:', sellerData.id);
      console.log('Vendedor nombre:', sellerData.name);
      const products = await sellerStoreService.getActiveStoreProducts(sellerData.id);
      console.log('✅ Productos cargados de la tienda:', products.length);
      
      // Cargar productos de Bodega Ecuador
      console.log('Buscando productos de Bodega Ecuador...');
      const allInventory = await inventoryService.getAll();
      const ecuadorInventory = allInventory.filter(inv => {
        const location = inv.location?.toLowerCase() || '';
        return (location.includes('ecuador') || inv.location === 'Ecuador') && inv.quantity > 0;
      });
      
      console.log('Productos de Bodega Ecuador encontrados:', ecuadorInventory.length);
      
      // Obtener todos los productos para mapear
      const allProducts = await productService.getAll();
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      
      // Guardar el tipo de precio del vendedor para usar en el map
      const sellerPriceType = sellerData.priceType;
      
      // Crear productos de Ecuador para la tienda
      const ecuadorStoreProducts = ecuadorInventory.map(inv => {
        const product = productMap.get(inv.productId);
        if (!product) return null;
        
        // Determinar precio según el tipo de precio del vendedor
        const unitPrice = sellerPriceType === 'price2' ? product.salePrice2 : product.salePrice1;
        
        return {
          id: `ecuador-${inv.id}`,
          productId: inv.productId,
          product: product,
          salePrice: unitPrice,
          availableStock: inv.quantity,
          isActive: true,
          isFromEcuador: true, // Marcar como producto de Ecuador
          description: `Disponible en Bodega Ecuador`
        };
      }).filter((p): p is NonNullable<typeof p> => p !== null);
      
      console.log('Productos de Ecuador procesados:', ecuadorStoreProducts.length);
      
      // Combinar productos de la tienda con productos de Ecuador
      const allStoreProducts = [...products, ...ecuadorStoreProducts];
      
      console.log('Total productos obtenidos:', allStoreProducts.length);
      if (allStoreProducts.length > 0) {
        console.log('Primeros productos:', allStoreProducts.slice(0, 3).map(p => ({
          id: p.id,
          productName: p.product?.name,
          isActive: p.isActive,
          salePrice: p.salePrice,
          isFromEcuador: (p as any).isFromEcuador || false
        })));
      } else {
        console.log('⚠️ No se encontraron productos activos para este vendedor');
        console.log('Verifica que el vendedor tenga productos agregados a la tienda y marcados como activos');
      }
      
      setStoreProducts(allStoreProducts);
      setSeller(sellerData);
      console.log('✅ Tienda cargada exitosamente');
    } catch (error: any) {
      console.error('❌ Error loading store data:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Guardar error para mostrar en la página
      setError(error?.message || 'Error desconocido al cargar la tienda');
      
      // Intentar mostrar información útil incluso si hay error
      if (error?.code === 'unavailable' || error?.code === 'unauthenticated') {
        console.error('⚠️ Problema de conexión con Firestore');
        setError('Error de conexión con la base de datos. Verifica tu conexión a internet.');
      }
      
      // Intentar obtener vendedores para mostrar ayuda
      try {
        const allSellers = await sellerService.getAll();
        setDebugInfo({
          error: true,
          mensaje: error?.message || 'Error desconocido',
          slugBuscado: slug,
          totalVendedores: allSellers.length,
          vendedores: allSellers.map(s => ({
            name: s.name,
            slug: s.slug || 'sin slug',
            id: s.id
          }))
        });
      } catch (err) {
        console.error('Error obteniendo vendedores:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    console.log('========================================');
    console.log('🚀 PUBLICSTORE COMPONENT MOUNTED');
    console.log('========================================');
    if (slug) {
      console.log('✅ Slug encontrado:', slug);
      console.log('User Agent:', navigator.userAgent);
      loadStoreData();
    } else {
      console.error('❌ No slug provided in URL');
    }
  }, [slug, loadStoreData]);

  // Cargar vendedores disponibles cuando no se encuentra el seller
  useEffect(() => {
    if (!seller && !loading && slug) {
      sellerService.getAll().then(sellers => {
        const matching = sellers.filter(s => {
          const nameLower = s.name.toLowerCase();
          const slugLower = (s.slug || '').toLowerCase();
          return nameLower.includes('luis') || slugLower.includes('luis') || slugLower === slug.toLowerCase();
        });
        setAvailableSellers(matching.length > 0 ? matching : sellers.slice(0, 5));
      }).catch(err => {
        console.error('Error obteniendo vendedores:', err);
      });
    }
  }, [seller, loading, slug]);

  // Funciones del carrito
  const addToCart = (storeProduct: any) => {
    // Verificar stock disponible
    const availableStock = storeProduct.availableStock || 0;
    if (availableStock <= 0) {
      toast.error('Este producto no tiene stock disponible');
      return;
    }
    
    const existingItem = cart.find(item => item.storeProductId === storeProduct.id);
    
    if (existingItem) {
      // Verificar que no exceda el stock disponible
      if (existingItem.quantity + 1 > availableStock) {
        toast.error(`Solo hay ${availableStock} unidades disponibles`);
        return;
      }
      setCart(cart.map(item =>
        item.storeProductId === storeProduct.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        storeProductId: storeProduct.id,
        productId: storeProduct.productId,
        productName: storeProduct.product?.name || 'Producto',
        productImage: storeProduct.product?.imageUrl,
        quantity: 1,
        unitPrice: storeProduct.salePrice,
        description: storeProduct.description,
        availableStock: availableStock
      }]);
    }
    setShowCart(true);
  };

  const updateQuantity = (storeProductId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(storeProductId);
      return;
    }
    
    // Buscar el producto para obtener su stock disponible
    const storeProduct = storeProducts.find(p => p.id === storeProductId);
    const availableStock = (storeProduct?.availableStock || 0);
    
    if (newQuantity > availableStock) {
      toast.error(`Solo hay ${availableStock} unidades disponibles`);
      return;
    }
    
    setCart(cart.map(item =>
      item.storeProductId === storeProductId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (storeProductId: string) => {
    setCart(cart.filter(item => item.storeProductId !== storeProductId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Cargando tienda...</p>
          <p className="mt-2 text-xs text-gray-400">Buscando: {slug}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-red-900">Error al cargar la tienda</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
          {debugInfo && debugInfo.vendedores && (
            <div className="mt-4 text-left bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">Vendedores disponibles:</p>
              <ul className="space-y-2 text-xs">
                {debugInfo.vendedores.slice(0, 5).map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.slug && s.slug !== 'sin slug' ? (
                      <a 
                        href={`/store/${s.slug}`}
                        className="text-blue-600 hover:text-blue-800 underline ml-2"
                      >
                        /store/{s.slug}
                      </a>
                    ) : (
                      <span className="text-gray-400 ml-2 text-[10px]">sin slug</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!seller && !loading) {
    const sellersToShow = debugInfo?.coincidencias?.length > 0 
      ? debugInfo.coincidencias 
      : (availableSellers.length > 0 ? availableSellers : (debugInfo?.vendedores?.slice(0, 5) || []));
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md w-full">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Tienda no encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontró una tienda para "<strong>{slug}</strong>".
          </p>
          
          {debugInfo && (
            <div className="mt-4 text-left bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-yellow-800 mb-1">Información de debug:</p>
              <p className="text-yellow-700">Slug buscado: <strong>{debugInfo.slugBuscado}</strong></p>
              <p className="text-yellow-700">Total vendedores: {debugInfo.totalVendedores}</p>
            </div>
          )}
          
          {sellersToShow.length > 0 && (
            <div className="mt-4 text-left bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                {debugInfo?.coincidencias?.length > 0 
                  ? 'Vendedores que coinciden:' 
                  : 'Vendedores disponibles:'}
              </p>
              <ul className="space-y-2 text-xs">
                {sellersToShow.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.slug && s.slug !== 'sin slug' ? (
                      <a 
                        href={`/store/${s.slug}`}
                        className="text-blue-600 hover:text-blue-800 underline ml-2"
                      >
                        /store/{s.slug}
                      </a>
                    ) : (
                      <span className="text-gray-400 ml-2 text-[10px]">sin slug</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <p className="mt-4 text-xs text-gray-500">
            Si tu vendedor aparece arriba, usa el link correcto con su slug.
          </p>
        </div>
      </div>
    );
  }

  // Esto nunca debería llegar aquí si no hay seller, pero por si acaso
  if (!seller) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Estado desconocido</h3>
          <p className="mt-1 text-sm text-gray-500">No se pudo determinar el estado de la tienda.</p>
          <p className="mt-2 text-xs text-gray-400">Slug: {slug || 'no proporcionado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '-webkit-fill-available' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Tienda de {seller.name}</h1>
            <p className="mt-2 text-sm text-gray-600">Explora nuestros productos disponibles</p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {storeProducts.length === 0 ? (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tienda vacía</h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay productos disponibles en este momento.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              El vendedor existe pero no tiene productos activos en la tienda.
              <br />
              Agrega productos desde el panel del vendedor para que aparezcan aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {storeProducts.map((storeProduct) => (
              <div 
                key={storeProduct.id} 
                className="bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
                onClick={() => setSelectedProduct(storeProduct)}
              >
                <div className="w-full h-44 bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
                  {storeProduct.product?.imageUrl ? (
                    <img
                      src={storeProduct.product.imageUrl}
                      alt={storeProduct.product.name}
                      className="w-full h-full object-contain max-w-full max-h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-2 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-0.5">
                    <h3 className="font-medium text-xs text-gray-900 line-clamp-2 leading-tight min-h-[2rem] flex-1">
                      {storeProduct.product?.name || 'Producto'}
                    </h3>
                    {storeProduct.isFromEcuador && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-yellow-400 text-yellow-900 ml-1 flex-shrink-0" title="Disponible en Bodega Ecuador">
                        <Flag className="h-2.5 w-2.5 mr-0.5" />
                        EC
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {storeProduct.product?.sku && (
                      <p className="text-xs text-gray-500 leading-tight">SKU: {storeProduct.product.sku}</p>
                    )}
                    {storeProduct.product?.size && (
                      <p className="text-xs text-gray-700 font-semibold leading-tight">Talla: {storeProduct.product.size}</p>
                    )}
                  </div>
                  {storeProduct.isFromEcuador && (
                    <p className="text-[9px] text-yellow-700 mb-1 font-medium">Stock Ecuador: {storeProduct.availableStock || 0}</p>
                  )}
                  <div className="flex items-center justify-between mb-1 mt-auto">
                    <span className="text-sm font-bold text-blue-600">
                      ${storeProduct.salePrice.toLocaleString()}
                    </span>
                    <span className={`text-[9px] font-medium ${
                      (storeProduct.availableStock || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      Stock: {storeProduct.availableStock ?? 'N/A'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(storeProduct);
                    }}
                    disabled={!storeProduct.availableStock || storeProduct.availableStock <= 0}
                    className={`w-full mt-1 px-2 py-1.5 text-white text-[10px] font-semibold rounded-md transition-colors flex items-center justify-center shadow-sm ${
                      (!storeProduct.availableStock || storeProduct.availableStock <= 0)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {(!storeProduct.availableStock || storeProduct.availableStock <= 0) ? 'Fuera de stock' : 'Agregar al pedido'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón flotante del carrito */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(!showCart)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 text-white rounded-full p-4 shadow-2xl hover:bg-blue-700 active:bg-blue-800 transition-colors z-40 flex items-center justify-center touch-manipulation"
          style={{ width: '56px', height: '56px', WebkitTapHighlightColor: 'transparent' }}
        >
          <ShoppingCart className="h-6 w-6" />
          {getCartItemsCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
              {getCartItemsCount() > 99 ? '99+' : getCartItemsCount()}
            </span>
          )}
        </button>
      )}

      {/* Panel del carrito */}
      {showCart && cart.length > 0 && (
        <div className="fixed bottom-24 right-2 sm:right-6 w-[calc(100%-1rem)] sm:w-96 max-h-[70vh] bg-white rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Carrito de Pedidos</h3>
            <button
              onClick={() => setShowCart(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <p className="text-center text-gray-500 py-4">El carrito está vacío</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.storeProductId} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400 m-auto mt-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ${item.unitPrice.toLocaleString()} c/u
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.storeProductId, item.quantity - 1)}
                            className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.storeProductId, item.quantity + 1)}
                            className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-gray-900">
                            ${(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.storeProductId)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-xl font-bold text-blue-600">
                ${getCartTotal().toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => {
                // Aquí se puede implementar la lógica para enviar el pedido
                const orderSummary = cart.map(item => ({
                  producto: item.productName,
                  cantidad: item.quantity,
                  precioUnitario: item.unitPrice,
                  subtotal: item.unitPrice * item.quantity
                }));
                
                const message = `Hola, me gustaría hacer un pedido:\n\n${orderSummary.map(item => 
                  `- ${item.producto} x${item.cantidad} = $${item.subtotal.toLocaleString()}`
                ).join('\n')}\n\nTotal: $${getCartTotal().toLocaleString()}`;
                
                const phoneNumber = seller.phone?.replace(/\D/g, '');
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                
                // Detectar si es móvil para abrir directamente la app de WhatsApp
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                if (isMobile) {
                  // En móviles, usar window.location.href para que abra directamente la app
                  window.location.href = whatsappUrl;
                } else {
                  // En escritorio, abrir en nueva pestaña
                  window.open(whatsappUrl, '_blank');
                }
              }}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={!seller?.phone}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Enviar Pedido por WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalle del Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header del Modal - Sticky */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-white flex-shrink-0 sticky top-0 z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Detalle del Producto</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Contenido del Modal - Scrollable */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Imagen */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden max-h-[40vh] sm:max-h-none">
                  {selectedProduct.product?.imageUrl ? (
                    <img
                      src={selectedProduct.product.imageUrl}
                      alt={selectedProduct.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 sm:h-24 sm:w-24 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Detalles */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                      {selectedProduct.product?.name || 'Producto'}
                    </h3>
                    {selectedProduct.product?.sku && (
                      <p className="text-xs sm:text-sm text-gray-500">SKU: {selectedProduct.product.sku}</p>
                    )}
                  </div>

                  {/* Talla y Color */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {selectedProduct.product?.size && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Talla</h4>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">
                          {selectedProduct.product.size}
                        </p>
                      </div>
                    )}
                    {(selectedProduct.product?.color || selectedProduct.product?.color2) && (
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Color</h4>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">
                          {selectedProduct.product.color}
                          {selectedProduct.product.color2 && selectedProduct.product.color && ' / '}
                          {selectedProduct.product.color2}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedProduct.description && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Descripción</h4>
                      <div className="text-sm sm:text-base text-gray-600 leading-relaxed prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: selectedProduct.description }} />
                      </div>
                    </div>
                  )}

                  {selectedProduct.product?.description && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">Información del Producto</h4>
                      <div className="text-sm sm:text-base text-gray-600 leading-relaxed prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: selectedProduct.product.description }} />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 sm:pt-4 border-t">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                        ${selectedProduct.salePrice.toLocaleString()}
                      </span>
                      {selectedProduct.isFromEcuador && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-yellow-400 text-yellow-900">
                          <Flag className="h-3 w-3 mr-1" />
                          ECUADOR
                        </span>
                      )}
                    </div>
                    <div className="mb-3 sm:mb-4">
                      <p className={`text-sm font-medium ${
                        (selectedProduct.availableStock || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Stock disponible: {selectedProduct.availableStock ?? 'N/A'}
                      </p>
                      {selectedProduct.isFromEcuador && (
                        <p className="text-xs text-yellow-700 mt-1">Disponible en Bodega Ecuador</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      disabled={!selectedProduct.availableStock || selectedProduct.availableStock <= 0}
                      className={`w-full text-white py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-medium transition-colors flex items-center justify-center shadow-md ${
                        (!selectedProduct.availableStock || selectedProduct.availableStock <= 0)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {(!selectedProduct.availableStock || selectedProduct.availableStock <= 0) ? 'Fuera de stock' : 'Agregar al pedido'}
                    </button>
                  </div>

                  {seller && (
                    <div className="pt-3 sm:pt-4 border-t">
                      <p className="text-xs sm:text-sm text-gray-500">
                        Vendedor: <span className="font-medium text-gray-700">{seller.name}</span>
                      </p>
                      {seller.phone && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          Teléfono: <span className="font-medium text-gray-700">{seller.phone}</span>
                        </p>
                      )}
                      {seller.email && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          Email: <span className="font-medium text-gray-700">{seller.email}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicStore;
