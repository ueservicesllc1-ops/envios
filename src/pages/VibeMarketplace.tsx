import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Filter, SlidersHorizontal, Loader2 } from 'lucide-react';
import VibeProductCard from '../components/vibe/VibeProductCard';

export default function VibeMarketplace() {
  const [activeFilter, setActiveFilter] = useState('Relevancia');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const filters = ['Relevancia', 'Más vendidos', 'Menor precio', 'Nuevos'];

  useEffect(() => {
    async function loadProducts() {
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
        console.error("Error loading products for marketplace:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    const aPrice = a.pvp || a.salePrice1 || a.originalPrice || a.salePrice || 0;
    const bPrice = b.pvp || b.salePrice1 || b.originalPrice || b.salePrice || 0;
    
    if (activeFilter === 'Menor precio') return aPrice - bPrice;
    if (activeFilter === 'Más vendidos') return (b.soldCount || 0) - (a.soldCount || 0);
    if (activeFilter === 'Nuevos') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      
      {/* Search Header */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 p-4 shadow-sm transition-all">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto w-full">
          <div className="flex-1 overflow-x-auto flex gap-2" style={{ scrollbarWidth: 'none' }}>
            {filters.map(filter => (
              <button 
                key={filter} 
                onClick={() => setActiveFilter(filter)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  activeFilter === filter 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <button className="flex items-center justify-center p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors hidden sm:flex">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-6 shadow-md shadow-blue-600/10">
          <h2 className="text-2xl font-black mb-1">Ofertas Flash Bodega</h2>
          <p className="text-sm opacity-90">Terminan en 02:45:10</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>No se encontraron productos en bodega.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {sortedProducts.map((product) => (
              <VibeProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

    </div>
  );
}
