import { Header } from "@/components/shop/Header"
import { ProductCard } from "@/components/shop/ProductCard"
import { mockProducts } from "@/lib/mocks"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header showNotifications />
      
      <main className="flex-1 pb-4">
        {/* Banner promocional */}
        <div className="bg-primary-container text-white px-4 py-6 m-4 rounded-xl shadow-sm">
          <h2 className="text-headline-lg-mobile font-bold mb-2">¡Flash Sale!</h2>
          <p className="text-body-sm opacity-90 mb-4">Hasta 70% de descuento en artículos seleccionados. Solo por 24 horas.</p>
          <button className="bg-white text-primary font-bold px-4 py-2 rounded-md text-sm shadow-sm hover:bg-gray-50 transition-colors">
            Comprar Ahora
          </button>
        </div>

        {/* Categories (horizontal scroll) */}
        <div className="px-4 mb-6 overflow-x-auto no-scrollbar">
          <div className="flex gap-3">
            {['Todo', 'Tecnología', 'Moda', 'Hogar', 'Deportes'].map((cat, i) => (
              <button 
                key={cat} 
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold border ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg text-gray-900">Recomendados para ti</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mockProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
            {mockProducts.map((product) => (
              <ProductCard key={product.id + "dup"} {...product} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
