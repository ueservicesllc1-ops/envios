import { useState, useEffect } from 'react';
import { Video, DollarSign, ListPlus, Loader2, PlayCircle, TrendingUp, Search, PlusCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateUserProfile } from '../../services/userService';
import { getProducts } from '../../services/productService'; // We will use this to find allowAffiliates products

export default function CreatorDashboard() {
  const { user, userProfile, refreshProfile } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('marketplace'); // 'marketplace' or 'showcase'
  const [affiliateProducts, setAffiliateProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (userProfile?.isCreator && activeTab === 'marketplace') {
      loadAffiliateProducts();
    }
  }, [userProfile, activeTab]);

  const loadAffiliateProducts = async () => {
    setLoadingProducts(true);
    // Para MVP traemos todos los productos activos y filtramos en frontend
    const all = await getProducts();
    const aff = all.filter(p => p.allowAffiliates === true && p.status === 'active');
    setAffiliateProducts(aff);
    setLoadingProducts(false);
  };

  const handleBecomeCreator = async () => {
    setLoading(true);
    try {
      await updateUserProfile(user.uid, { 
        isCreator: true,
        showcase: [] // Array de IDs de productos en su vitrina
      });
      await refreshProfile();
      addToast('¡Felicidades! Ahora eres un Creador/Afiliado.', 'success');
    } catch (error) {
      addToast('Error al activar cuenta de creador', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowcase = async (productId) => {
    if (!userProfile) return;
    const currentShowcase = userProfile.showcase || [];
    const isAlreadyAdded = currentShowcase.includes(productId);
    
    let newShowcase;
    if (isAlreadyAdded) {
      newShowcase = currentShowcase.filter(id => id !== productId);
    } else {
      newShowcase = [...currentShowcase, productId];
    }

    try {
      await updateUserProfile(user.uid, { showcase: newShowcase });
      await refreshProfile(); // Para que el UI se actualice con la nueva vitrina
      addToast(isAlreadyAdded ? 'Removido de tu Vitrina' : 'Añadido a tu Vitrina', 'success');
    } catch (e) {
      addToast('Error actualizando vitrina', 'error');
    }
  };

  if (!userProfile?.isCreator) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Monetiza tu influencia</h2>
          <p className="text-gray-500 mb-8">Únete al programa de Afiliados de ShopVibe. Crea videos, etiqueta productos y gana comisiones por cada venta.</p>
          <ul className="text-left text-sm text-gray-600 mb-8 space-y-3">
            <li className="flex items-center gap-2">✨ <span>Sin inventario ni envíos</span></li>
            <li className="flex items-center gap-2">💰 <span>Comisiones automáticas</span></li>
            <li className="flex items-center gap-2">📱 <span>Totalmente integrado en tus videos</span></li>
          </ul>
          <button 
            onClick={handleBecomeCreator}
            disabled={loading}
            className="w-full bg-pink-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-600/30 hover:bg-pink-700 transition-colors flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Convertirme en Creador'}
          </button>
        </div>
      </div>
    );
  }

  // Creador activo
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30">
        <h1 className="font-bold text-xl text-gray-900">Centro de Creadores</h1>
        <p className="text-xs text-gray-500">Bienvenido, {userProfile?.displayName}</p>
      </div>

      <div className="p-4 max-w-5xl mx-auto w-full flex flex-col gap-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="w-4 h-4 text-green-500" /> <span className="text-xs font-bold">Ganancias</span>
            </div>
            <p className="text-2xl font-black text-gray-900">$0.00</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <PlayCircle className="w-4 h-4 text-pink-500" /> <span className="text-xs font-bold">Videos Vibe</span>
            </div>
            <p className="text-2xl font-black text-gray-900">0</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> <span className="text-xs font-bold">Clicks</span>
            </div>
            <p className="text-2xl font-black text-gray-900">0</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mt-4">
          <button 
            className={`pb-2 font-bold text-sm ${activeTab === 'marketplace' ? 'border-b-2 border-pink-600 text-pink-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('marketplace')}
          >
            Mercado de Afiliados
          </button>
          <button 
            className={`pb-2 font-bold text-sm ${activeTab === 'showcase' ? 'border-b-2 border-pink-600 text-pink-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('showcase')}
          >
            Mi Vitrina ({userProfile?.showcase?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'marketplace' && (
            <div>
              <div className="mb-4 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar productos con comisión..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              </div>

              {loadingProducts ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-pink-600" /></div>
              ) : affiliateProducts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm">
                  No hay productos disponibles con programa de afiliados en este momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {affiliateProducts.map(p => {
                    const isAdded = userProfile?.showcase?.includes(p.id);
                    return (
                      <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 flex gap-3 shadow-sm">
                        <img src={p.image} className="w-20 h-20 rounded-lg object-cover bg-gray-50" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{p.title}</h3>
                            <p className="text-xs text-gray-500">{p.sellerName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-bold text-gray-900">${p.price}</span>
                              <span className="bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded">Gana {p.commissionRate}%</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleShowcase(p.id)}
                            className={`mt-2 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors ${
                              isAdded ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600' : 'bg-pink-600 text-white hover:bg-pink-700'
                            }`}
                          >
                            {isAdded ? <><CheckCircle className="w-3 h-3" /> En Vitrina</> : <><PlusCircle className="w-3 h-3" /> Añadir a Vitrina</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'showcase' && (
            <div className="bg-white rounded-xl p-8 text-center">
              {userProfile?.showcase?.length > 0 ? (
                <p className="text-gray-500 text-sm">Tienes {userProfile.showcase.length} productos en tu vitrina. Cuando subas un video en Vibe, podrás etiquetarlos para ganar comisiones.</p>
              ) : (
                <div className="flex flex-col items-center">
                  <ListPlus className="w-12 h-12 text-gray-300 mb-3" />
                  <h3 className="font-bold text-gray-900">Tu vitrina está vacía</h3>
                  <p className="text-gray-500 text-xs mt-1 mb-4">Ve al Mercado de Afiliados y añade productos para promocionar.</p>
                  <button onClick={() => setActiveTab('marketplace')} className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-black">Explorar Mercado</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
