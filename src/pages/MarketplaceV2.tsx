import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Loader2 } from 'lucide-react';
import VibeProductCard from '../components/vibe/VibeProductCard';

export default function MarketplaceV2() {
  const categories = ['Todo', 'Ropa', 'Perfumes', 'VITAMINAS', 'ZAPATOS', 'Electrónicos', 'Otros'];
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todo');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('origin', '==', 'local'),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(fetched);
      } catch (error) {
        console.error("Error fetching local products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const displayedProducts = activeCategory === 'Todo' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pt-16">
      {/* Banner promocional */}
      <div className="bg-blue-600 text-white px-4 py-6 m-4 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-2">¡Flash Sale Ecuador!</h2>
        <p className="text-sm opacity-90 mb-4">Hasta 50% de descuento en inventario local. Envío inmediato.</p>
        <button className="bg-white text-blue-600 font-bold px-4 py-2 rounded-md text-sm shadow-sm hover:bg-gray-50 transition-colors">
          Comprar Ahora
        </button>
      </div>

      {/* Categorías (horizontal scroll) */}
      <div className="px-4 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-3">
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                activeCategory === cat 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Promoción Vibe (Stitch style) */}
      <div className="mx-4 mb-6 block bg-gray-900 text-white p-4 rounded-xl relative overflow-hidden cursor-pointer">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1516280440502-3c467ea303ee?w=500&auto=format&fit=crop&q=60')] bg-cover bg-center"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">En Vivo</span>
            </div>
            <h3 className="font-bold text-lg">Nuevos Ingresos Bodega</h3>
            <p className="text-xs text-gray-300">Con Gabriel Tech</p>
          </div>
          <div className="bg-blue-600 px-3 py-1.5 rounded text-sm font-bold">Unirse</div>
        </div>
      </div>

      {/* Grilla de Productos */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-900">
            {activeCategory === 'Todo' ? 'Recomendados para ti' : activeCategory}
          </h3>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            No se encontraron productos en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayedProducts.map((product) => (
              <VibeProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
