import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Store, X, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { sellerStoreService } from '../services/sellerStoreService';
import { sellerService } from '../services/sellerService';

interface CartItem {
  storeProductId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  description?: string;
}

const PublicStore: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const loadStoreData = useCallback(async () => {
    if (!slug) {
      console.error('No slug provided');
      return;
    }
    try {
      setLoading(true);
      console.log('Cargando datos de la tienda para slug:', slug);
      
      // Buscar vendedor por slug
      let sellerData = await sellerService.getBySlug(slug);
      
      // Si no se encuentra por slug, intentar buscar por nombre
      if (!sellerData) {
        console.log('No se encontró por slug, intentando buscar por nombre:', slug);
        sellerData = await sellerService.getByName(slug);
      }
      
      // Si aún no se encuentra, intentar buscar por ID (para compatibilidad)
      if (!sellerData) {
        console.log('No se encontró por nombre, intentando buscar por ID:', slug);
        sellerData = await sellerService.getById(slug);
      }
      
      if (!sellerData) {
        console.error('Vendedor no encontrado con slug/nombre/ID:', slug);
        console.log('Intentando obtener todos los vendedores para debug...');
        try {
          const allSellers = await sellerService.getAll();
          console.log('Vendedores disponibles:', allSellers.map(s => ({ 
            name: s.name, 
            slug: s.slug || 'sin slug', 
            id: s.id 
          })));
        } catch (debugError) {
          console.error('Error obteniendo vendedores para debug:', debugError);
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
      console.log('Buscando productos de la tienda para sellerId:', sellerData.id);
      const products = await sellerStoreService.getActiveStoreProducts(sellerData.id);
      
      console.log('Productos obtenidos:', products.length);
      if (products.length > 0) {
        console.log('Primeros productos:', products.slice(0, 3).map(p => ({
          id: p.id,
          productName: p.product?.name,
          isActive: p.isActive,
          salePrice: p.salePrice
        })));
      } else {
        console.log('⚠️ No se encontraron productos activos para este vendedor');
        console.log('Verifica que el vendedor tenga productos agregados a la tienda y marcados como activos');
      }
      
      setStoreProducts(products);
      setSeller(sellerData);
    } catch (error) {
      console.error('Error loading store data:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      console.log('PublicStore mounted with slug:', slug);
      console.log('User Agent:', navigator.userAgent);
      loadStoreData();
    } else {
      console.error('No slug provided in URL');
    }
  }, [slug, loadStoreData]);

  // Funciones del carrito
  const addToCart = (storeProduct: any) => {
    const existingItem = cart.find(item => item.storeProductId === storeProduct.id);
    
    if (existingItem) {
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
        description: storeProduct.description
      }]);
    }
    setShowCart(true);
  };

  const updateQuantity = (storeProductId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(storeProductId);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tienda no encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">
            No se encontró una tienda para "{slug}".
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Verifica que el vendedor exista en Firestore y que el link sea correcto.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Revisa la consola del navegador para más detalles de debug.
          </p>
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
                  <h3 className="font-medium text-xs text-gray-900 mb-0.5 line-clamp-2 leading-tight min-h-[2rem]">
                    {storeProduct.product?.name || 'Producto'}
                  </h3>
                  <div className="flex items-center gap-2 mb-1">
                    {storeProduct.product?.sku && (
                      <p className="text-xs text-gray-500 leading-tight">SKU: {storeProduct.product.sku}</p>
                    )}
                    {storeProduct.product?.size && (
                      <p className="text-xs text-gray-700 font-semibold leading-tight">Talla: {storeProduct.product.size}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-1 mt-auto">
                    <span className="text-sm font-bold text-blue-600">
                      ${storeProduct.salePrice.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(storeProduct);
                    }}
                    className="w-full mt-1 px-2 py-1.5 bg-blue-600 text-white text-[10px] font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar al pedido
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Detalle del Producto</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Imagen */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProduct.product?.imageUrl ? (
                    <img
                      src={selectedProduct.product.imageUrl}
                      alt={selectedProduct.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-24 w-24 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Detalles */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedProduct.product?.name || 'Producto'}
                    </h3>
                    {selectedProduct.product?.sku && (
                      <p className="text-sm text-gray-500">SKU: {selectedProduct.product.sku}</p>
                    )}
                  </div>

                  {/* Talla y Color */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProduct.product?.size && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Talla</h4>
                        <p className="text-base text-gray-900 font-medium">
                          {selectedProduct.product.size}
                        </p>
                      </div>
                    )}
                    {(selectedProduct.product?.color || selectedProduct.product?.color2) && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Color</h4>
                        <p className="text-base text-gray-900 font-medium">
                          {selectedProduct.product.color}
                          {selectedProduct.product.color2 && selectedProduct.product.color && ' / '}
                          {selectedProduct.product.color2}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedProduct.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h4>
                      <p className="text-gray-600 leading-relaxed">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}

                  {selectedProduct.product?.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Información del Producto</h4>
                      <p className="text-gray-600 leading-relaxed">
                        {selectedProduct.product.description}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-3xl font-bold text-blue-600">
                        ${selectedProduct.salePrice.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center shadow-md"
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Agregar al pedido
                    </button>
                  </div>

                  {seller && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Vendedor: <span className="font-medium text-gray-700">{seller.name}</span>
                      </p>
                      {seller.phone && (
                        <p className="text-sm text-gray-500 mt-1">
                          Teléfono: <span className="font-medium text-gray-700">{seller.phone}</span>
                        </p>
                      )}
                      {seller.email && (
                        <p className="text-sm text-gray-500 mt-1">
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
