import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Heart, Share2, ShoppingCart, ShieldCheck, ChevronRight, Store, Minus, Plus, Loader2 } from 'lucide-react';
import { mockSellers } from '../data/mockSellers';
import { getProductById, getProducts } from '../services/productService';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useState, useEffect } from 'react';
import ProductCard from '../components/product/ProductCard';
import { cn } from '../lib/utils';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isFavorite } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const prod = await getProductById(id);
      setProduct(prod);
      if (prod) {
        const allProds = await getProducts();
        setRelatedProducts(allProds.filter(p => p.id !== prod.id).slice(0, 4));
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!product) {
    return <div className="p-8 text-center mt-20">Producto no encontrado. <br/><button onClick={() => navigate('/')} className="mt-4 text-primary font-bold">Volver al inicio</button></div>;
  }

  const isFav = isFavorite(product.id);
  const seller = mockSellers[0];

  const handleAddToCart = () => {
    for(let i=0; i<quantity; i++){
      addToCart(product);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      {/* Navbar Detalle */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-safe">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-black/30 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/40">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-black/30 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/40">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={() => toggleWishlist(product)} className="w-10 h-10 bg-black/30 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/40">
            <Heart className={cn("w-5 h-5", isFav && "fill-red-500 text-red-500")} />
          </button>
        </div>
      </div>

      {/* Imagen */}
      <div className="w-full aspect-square bg-white relative">
        <img src={product.image} alt={product.title} className="w-full h-full object-contain" />
      </div>

      {/* Info Principal */}
      <div className="bg-white p-4 mb-2">
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-bold text-secondary">${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through mb-1">${product.originalPrice.toFixed(2)}</span>
          )}
        </div>
        <h1 className="text-base font-bold text-gray-900 leading-tight mb-3">
          {product.title}
        </h1>
        <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-1 text-gray-600 font-medium">
            <Star className="w-4 h-4 fill-[#FFC107] text-[#FFC107]" />
            <span>{product.rating}</span>
            <span className="mx-1">•</span>
            <span>{product.soldCount} vendidos</span>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">Cantidad</span>
          <div className="flex items-center border border-gray-200 rounded-full bg-gray-50 h-9 w-28">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex-1 flex justify-center items-center text-gray-500 hover:text-primary"><Minus className="w-4 h-4" /></button>
            <span className="text-sm font-semibold w-8 text-center">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="flex-1 flex justify-center items-center text-gray-500 hover:text-primary"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Seller info */}
      <div className="bg-white p-4 mb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <img src={seller.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{seller.name}</h3>
            <p className="text-xs text-gray-500">{seller.followers} seguidores • {seller.rating} rating</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs font-bold text-primary border border-primary px-3 py-1 rounded-full">Seguir</button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Action Bar (ahora visible directamente abajo del producto) */}
      <div className="bg-white border-t border-gray-200 p-4 flex flex-col sm:flex-row items-center gap-3 mt-4 mb-2 shadow-sm max-w-5xl mx-auto w-full">
        <button onClick={() => navigate('/cart')} className="flex items-center justify-center gap-2 text-gray-700 hover:text-primary transition-colors w-full sm:w-auto px-4 py-3 bg-gray-100 rounded-full font-medium">
          <ShoppingCart className="w-5 h-5" />
          <span>Ver Carrito</span>
        </button>
        <button onClick={handleAddToCart} className="flex-1 w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-full text-base hover:bg-orange-200 transition-colors">
          Añadir al carrito
        </button>
        <button onClick={() => { handleAddToCart(); navigate('/cart'); }} className="flex-1 w-full bg-primary text-white font-bold py-3 rounded-full text-base hover:bg-primary-variant transition-colors shadow-md shadow-primary/20">
          Comprar ahora
        </button>
      </div>

      {/* Garantía y Detalles */}
      <div className="bg-white p-4 mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-4 bg-green-50 p-3 rounded-lg border border-green-100">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">Devolución gratis en 90 días garantizada</span>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-bold mb-2">Especificaciones</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex justify-between"><span className="text-gray-400">Marca</span> <span className="font-medium text-gray-900">{product.brand || 'Genérica'}</span></li>
            <li className="flex justify-between"><span className="text-gray-400">Condición</span> <span className="font-medium text-gray-900">Nuevo</span></li>
            <li className="flex justify-between"><span className="text-gray-400">Colección</span> <span className="font-medium text-gray-900">{product.collection || 'General'}</span></li>
          </ul>
        </div>
      </div>

      {/* Related Products */}
      <div className="bg-white p-4 mb-2">
        <h3 className="font-bold text-gray-900 mb-4">Productos similares</h3>
        <div className="grid grid-cols-2 gap-3">
          {relatedProducts.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}