import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, ShoppingCart } from 'lucide-react';
import { getProducts } from '../services/productService';
import { useNavigate } from 'react-router-dom';
import MobileNav from '../components/layout/MobileNav';

export default function VibeFeed() {
  const [product, setProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Para el demo, cargamos el primer producto disponible (preferiblemente de afiliados)
    getProducts().then(products => {
      if (products.length > 0) {
        // Buscar uno con allowAffiliates si existe, sino el primero
        const affProduct = products.find(p => p.allowAffiliates) || products[0];
        setProduct(affProduct);
      }
    });
  }, []);

  const handleProductClick = () => {
    if (!product) return;
    // Si fuera un video de un creador real, usaríamos su creatorId. Aquí simulamos uno.
    const creatorAffiliateId = 'creator_demo_123';
    // Navegamos al producto pasando el ID del afiliado (que el carrito podría leer después)
    navigate(`/product/${product.id}?aff=${creatorAffiliateId}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col md:flex-row">
      <div className="flex-1 h-full relative max-w-md mx-auto bg-gray-900 w-full snap-y snap-mandatory overflow-y-scroll no-scrollbar">
        
        <div className="h-full w-full snap-center relative">
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80" className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
          
          <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
            <button className="flex flex-col items-center gap-1"><Heart className="w-8 h-8 text-white hover:text-pink-500 transition-colors" /> <span className="text-xs font-bold">45.2k</span></button>
            <button className="flex flex-col items-center gap-1"><MessageCircle className="w-8 h-8" /> <span className="text-xs font-bold">1,204</span></button>
            <button className="flex flex-col items-center gap-1"><Share2 className="w-8 h-8" /> <span className="text-xs font-bold">89</span></button>
          </div>

          <div className="absolute bottom-6 left-4 right-20 z-10">
            <h3 className="font-bold text-lg mb-1">@influencer_pro</h3>
            <p className="text-sm mb-3">¡Miren esta maravilla! Recomendado al 100% 🔥🛍️ #shopping #musthave</p>
            
            {product && (
              <button 
                onClick={handleProductClick}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex gap-3 items-center hover:bg-white/20 transition-all text-left"
              >
                <img src={product.image} className="w-12 h-12 rounded-lg object-cover bg-white" />
                <div className="flex-1">
                  <p className="font-bold text-sm line-clamp-1">{product.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-pink-400 font-bold">${product.price.toFixed(2)}</p>
                    {product.allowAffiliates && (
                      <span className="bg-pink-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Ganador de Comisión</span>
                    )}
                  </div>
                </div>
                <ShoppingCart className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

      </div>

      <MobileNav />
    </div>
  );
}