import React, { useState, useEffect } from 'react';
import {
  DollarSign, PlayCircle, TrendingUp, Search,
  PlusCircle, CheckCircle, Loader2, ListPlus,
  ArrowRight, Sparkles, Package, Home, User, ShoppingCart, Video
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/config';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUtils';
import { useCart } from '../contexts/CartContext';

interface AffiliateProduct {
  id: string;
  name: string;
  salePrice1?: number;
  salePrice2?: number;
  imageUrl?: string;
  allowAffiliates?: boolean;
  commissionRate?: number;
  sellerName?: string;
  category?: string;
}

export default function VibeSeller() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cartItemsCount } = useCart();
  
  const [activeTab, setActiveTab] = useState<'marketplace' | 'showcase'>('marketplace');
  const [affiliateProducts, setAffiliateProducts] = useState<AffiliateProduct[]>([]);
  const [showcase, setShowcase] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar estado del usuario
  useEffect(() => {
    if (!user) return;
    const loadUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'userPreferences', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setShowcase(data.showcase || []);
          setDisplayName(data.displayName || user.displayName || '');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, [user]);

  // Cargar productos del catálogo central (Bodega)
  useEffect(() => {
    loadAffiliateProducts();
  }, []);

  const loadAffiliateProducts = async () => {
    setLoadingProducts(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const all = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          // Si no tiene comisión definida, asignamos 10% por defecto
          commissionRate: d.data().commissionRate || 10 
      } as AffiliateProduct));
      
      setAffiliateProducts(all);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar el catálogo de productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleShowcase = async (productId: string) => {
    if (!user) return;
    const isAdded = showcase.includes(productId);
    const newShowcase = isAdded
      ? showcase.filter(id => id !== productId)
      : [...showcase, productId];

    try {
      await updateDoc(doc(db, 'userPreferences', user.uid), { showcase: newShowcase });
      setShowcase(newShowcase);
      toast.success(isAdded ? '🗑️ Removido de tu Vitrina' : '✅ Añadido a tu Vitrina');
    } catch (e) {
      toast.error('Error actualizando vitrina');
    }
  };

  const filteredProducts = affiliateProducts.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: '100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316, #ea580c)',
        padding: '24px 20px 32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '160px', height: '160px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.9)' }} />
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: 600 }}>Centro de Afiliados</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 900, marginBottom: '2px' }}>
            Hola, {displayName || 'Vendedor'} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
            {showcase.length} producto{showcase.length !== 1 ? 's' : ''} en tu vitrina
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px' }}>
          {[
            { icon: <DollarSign style={{ width: '16px', height: '16px', color: '#22c55e' }} />, label: 'Comisiones', value: '$0.00' },
            { icon: <PlayCircle style={{ width: '16px', height: '16px', color: '#f9a8d4' }} />, label: 'Videos', value: '0' },
            { icon: <TrendingUp style={{ width: '16px', height: '16px', color: '#93c5fd' }} />, label: 'Ventas', value: '0' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '12px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                {stat.icon}
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', fontWeight: 600 }}>{stat.label}</span>
              </div>
              <p style={{ color: '#fff', fontSize: '20px', fontWeight: 900, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/seller/upload-video')}
            style={{
              flex: 1,
              background: '#fff',
              color: '#ea580c',
              fontWeight: 800,
              fontSize: '14px',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'transform 0.15s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Video style={{ width: '18px', height: '18px' }} />
            Subir Video
          </button>
          
          <button
            onClick={() => navigate('/vibe-host')}
            style={{
              flex: 1,
              background: '#ea580c',
              color: '#fff',
              fontWeight: 800,
              fontSize: '14px',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
              transition: 'transform 0.15s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Video style={{ width: '18px', height: '18px' }} />
            Transmitir Live
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 16px' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          marginTop: '16px',
          gap: '8px'
        }}>
          {[
            { id: 'marketplace', label: 'Catálogo Central', count: affiliateProducts.length },
            { id: 'showcase', label: 'Mi Vitrina', count: showcase.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                paddingBottom: '10px',
                fontWeight: 700,
                fontSize: '14px',
                color: activeTab === tab.id ? '#ea580c' : '#9ca3af',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #ea580c' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {tab.label}
              <span style={{
                background: activeTab === tab.id ? '#ea580c' : '#f3f4f6',
                color: activeTab === tab.id ? '#fff' : '#6b7280',
                borderRadius: '20px',
                padding: '1px 7px',
                fontSize: '11px',
                fontWeight: 700
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Catálogo Central */}
        {activeTab === 'marketplace' && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Buscar productos para promocionar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '16px',
                  height: '44px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>

            {loadingProducts ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#ea580c', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '48px',
                textAlign: 'center',
                border: '1px solid #f0f0f0'
              }}>
                <Package style={{ width: '40px', height: '40px', color: '#d1d5db', margin: '0 auto 12px' }} />
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  No se encontraron productos en el catálogo.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {filteredProducts.map(p => {
                  const isAdded = showcase.includes(p.id);
                  const price = p.salePrice2 || p.salePrice1 || 0;
                  const commission = p.commissionRate || 10;
                  const earn = ((price * commission) / 100).toFixed(2);

                  return (
                    <div key={p.id} style={{
                      background: '#fff',
                      borderRadius: '16px',
                      border: '1px solid #f0f0f0',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={getImageUrl(p.imageUrl) || '/placeholder.png'}
                          alt={p.name}
                          style={{ width: '100%', height: '140px', objectFit: 'contain', background: '#fff', padding: '8px' }}
                        />
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          background: 'linear-gradient(135deg, #f97316, #ea580c)',
                          color: '#fff',
                          borderRadius: '20px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 800,
                          boxShadow: '0 2px 4px rgba(234,88,12,0.3)'
                        }}>
                          Gana {commission}%
                        </div>
                      </div>

                      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '12px', color: '#111', marginBottom: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2' }}>
                          {p.name}
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: 'auto' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: '#111' }}>${price.toFixed(2)}</span>
                          <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                            +${earn}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleShowcase(p.id)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '10px',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            background: isAdded ? '#fff3ed' : 'linear-gradient(135deg, #f97316, #ea580c)',
                            color: isAdded ? '#ea580c' : '#fff',
                            transition: 'all 0.2s',
                            boxShadow: isAdded ? 'none' : '0 2px 8px rgba(234,88,12,0.3)'
                          }}
                        >
                          {isAdded
                            ? <><CheckCircle style={{ width: '14px', height: '14px' }} /> En Vitrina</>
                            : <><PlusCircle style={{ width: '14px', height: '14px' }} /> Promocionar</>
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mi Vitrina */}
        {activeTab === 'showcase' && (
          <div style={{ marginTop: '16px' }}>
            {showcase.length === 0 ? (
              <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '56px 24px',
                textAlign: 'center',
                border: '1px solid #f0f0f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  width: '64px', height: '64px',
                  background: '#fff3ed',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <ListPlus style={{ width: '28px', height: '28px', color: '#ea580c' }} />
                </div>
                <h3 style={{ fontWeight: 800, color: '#111', fontSize: '18px', marginBottom: '8px' }}>
                  Tu vitrina está vacía
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '300px', margin: '0 auto 24px' }}>
                  Ve al Catálogo Central y añade los productos que quieras promocionar para ganar comisiones.
                </p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  style={{
                    background: '#111',
                    color: '#fff',
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Explorar Catálogo <ArrowRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                  {showcase.length} producto{showcase.length !== 1 ? 's' : ''} listos para promocionar en tus redes.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {showcase.map(id => {
                    const p = affiliateProducts.find(a => a.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} style={{
                        background: '#fff',
                        borderRadius: '16px',
                        border: '1px solid #f0f0f0',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: '#fff', padding: '4px', border: '1px solid #f9fafb' }}>
                          <img
                            src={getImageUrl(p.imageUrl) || '/placeholder.png'}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '14px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                            {p.name}
                          </p>
                          <p style={{ fontSize: '12px', color: '#ea580c', fontWeight: 800, margin: 0 }}>
                            Comisión: {p.commissionRate || 10}%
                          </p>
                          <button
                            onClick={() => {
                                const link = `${window.location.origin}/product/${p.id}?aff=${user?.uid}`;
                                navigator.clipboard.writeText(link);
                                toast.success('¡Enlace de afiliado copiado!');
                            }}
                            style={{ 
                                marginTop: '6px', fontSize: '11px', color: '#fff', background: '#ea580c', 
                                border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 
                            }}
                          >
                            Copiar mi Enlace
                          </button>
                        </div>
                        <button
                          onClick={() => toggleShowcase(id)}
                          style={{ fontSize: '11px', color: '#ef4444', background: '#fef2f2', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontWeight: 700 }}
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full z-50 rounded-t-xl bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex justify-around items-center py-2 px-2 pb-safe border-t border-gray-100" style={{ position: 'fixed', bottom: 0 }}>
        <button onClick={() => navigate('/vibe-market')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150" style={{ background: 'none', border: 'none' }}>
          <Home className="w-6 h-6 mb-1" />
          <span className="font-bold text-[10px]">Inicio</span>
        </button>
        <button onClick={() => navigate('/cart')} className="flex flex-col items-center justify-center text-gray-400 hover:text-orange-600 active:scale-90 transition-all duration-150" style={{ background: 'none', border: 'none' }}>
          <div className="relative">
            <ShoppingCart className="w-6 h-6 mb-1" />
            {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    {cartItemsCount}
                </span>
            )}
          </div>
          <span className="font-bold text-[10px]">Carrito</span>
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center justify-center text-orange-600 active:scale-90 transition-all duration-150" style={{ background: 'none', border: 'none' }}>
          <User className="w-6 h-6 mb-1" />
          <span className="font-bold text-[10px]">Perfil</span>
        </button>
      </nav>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
