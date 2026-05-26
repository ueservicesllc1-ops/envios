import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowLeft, Star, Heart, Share2, ShoppingCart, ShieldCheck, ChevronRight, Minus, Plus, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import VibeProductCard from '../components/vibe/VibeProductCard';
import toast from 'react-hot-toast';

export default function VibeProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const prodData = { id: docSnap.id, ...docSnap.data() };
          setProduct(prodData);
          
          // Load related products
          const q = query(
            collection(db, 'products'),
            where('origin', '==', 'local'),
            limit(5)
          );
          const snapshot = await getDocs(q);
          const allProds = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.id !== id);
          setRelatedProducts(allProds.slice(0, 4));
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product detail:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center mt-20">
        <p className="text-gray-600 mb-4">Producto no encontrado.</p>
        <button 
          onClick={() => navigate('/vibe-market')} 
          className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const title = product.name || 'Producto';
  const price = product.salePrice1 || product.originalPrice || product.salePrice || 0;
  const originalPrice = product.originalPrice || (price * 1.2);
  const image = product.imageUrl || 'https://via.placeholder.com/600';
  const rating = 4.5;
  const soldCount = 120;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product, 'product');
    }
    toast.success(`${quantity} ${quantity === 1 ? 'producto añadido' : 'productos añadidos'} al carrito`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 pt-16">
      {/* Navbar Detalle (Sticky at top of pt-16) */}
      <div className="bg-white border-b border-gray-100 p-4 sticky top-16 z-30 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button onClick={() => {
            if (navigator.share) {
              navigator.share({ title, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Enlace copiado al portapapeles');
            }
          }} className="w-10 h-10 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={() => setIsFav(!isFav)} className="w-10 h-10 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Heart className={`w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-6">
        <div className="md:grid md:grid-cols-2 md:gap-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          
          {/* Imagen */}
          <div className="aspect-square bg-white relative flex items-center justify-center rounded-xl overflow-hidden border border-gray-50 p-4">
            <img src={image} alt={title} className="max-w-full max-h-full object-contain" />
          </div>

          {/* Info Principal */}
          <div className="flex flex-col justify-between mt-6 md:mt-0">
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-extrabold text-blue-600">${Number(price).toFixed(2)}</span>
                {originalPrice && originalPrice > price && (
                  <span className="text-sm text-gray-400 line-through mb-1">${Number(originalPrice).toFixed(2)}</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">
                {title}
              </h1>
              <div className="flex items-center gap-1 text-sm text-gray-600 font-medium pb-4 border-b border-gray-100 mb-4">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{rating}</span>
                <span className="mx-1">•</span>
                <span>{soldCount} vendidos</span>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold text-gray-900">Cantidad</span>
                <div className="flex items-center border border-gray-200 rounded-full bg-gray-50 h-9 w-28">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex-1 flex justify-center items-center text-gray-500 hover:text-blue-600"><Minus className="w-4 h-4" /></button>
                  <span className="text-sm font-semibold w-8 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="flex-1 flex justify-center items-center text-gray-500 hover:text-blue-600"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleAddToCart} 
                className="w-full bg-blue-100 text-blue-600 font-bold py-3.5 rounded-full text-base hover:bg-blue-200 transition-colors shadow-sm"
              >
                Añadir al carrito
              </button>
              <button 
                onClick={() => { handleAddToCart(); navigate('/cart'); }} 
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-full text-base hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
              >
                Comprar ahora
              </button>
            </div>
          </div>
        </div>

        {/* Garantía y Detalles */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-4 bg-green-50 p-3 rounded-xl border border-green-100">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">Devolución gratis en 90 días garantizada</span>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-bold mb-2 text-gray-900">Especificaciones</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-400">Marca</span> <span className="font-medium text-gray-900">{product.brand || 'Genérica'}</span></li>
              <li className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-400">Condición</span> <span className="font-medium text-gray-900">Nuevo</span></li>
              <li className="flex justify-between"><span className="text-gray-400">Colección</span> <span className="font-medium text-gray-900">{product.collection || 'General'}</span></li>
            </ul>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-900 mb-4">Productos similares</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {relatedProducts.map((p) => (
                <VibeProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
