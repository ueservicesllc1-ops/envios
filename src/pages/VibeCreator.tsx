import React, { useState, useEffect } from 'react';
import {
  Video, DollarSign, PlayCircle, TrendingUp, Search,
  PlusCircle, CheckCircle, Loader2, ListPlus, Star,
  ArrowRight, Sparkles, Users, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase/config';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUtils';

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

export default function VibeCreator() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'showcase'>('marketplace');
  const [affiliateProducts, setAffiliateProducts] = useState<AffiliateProduct[]>([]);
  const [showcase, setShowcase] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar estado del usuario
  useEffect(() => {
    if (!user) return;
    const loadUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setIsCreator(data.isCreator || false);
          setShowcase(data.showcase || []);
          setDisplayName(data.displayName || user.displayName || '');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, [user]);

  // Cargar productos con afiliados
  useEffect(() => {
    if (!isCreator || activeTab !== 'marketplace') return;
    loadAffiliateProducts();
  }, [isCreator, activeTab]);

  const loadAffiliateProducts = async () => {
    setLoadingProducts(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateProduct));
      setAffiliateProducts(all.filter(p => p.allowAffiliates === true));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleBecomeCreator = async () => {
    if (!user) { toast.error('Debes iniciar sesión'); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isCreator: true,
        showcase: []
      });
      setIsCreator(true);
      toast.success('¡Felicidades! Ahora eres Creador/Afiliado 🎉');
    } catch (e) {
      toast.error('Error al activar cuenta de creador');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowcase = async (productId: string) => {
    if (!user) return;
    const isAdded = showcase.includes(productId);
    const newShowcase = isAdded
      ? showcase.filter(id => id !== productId)
      : [...showcase, productId];

    try {
      await updateDoc(doc(db, 'users', user.uid), { showcase: newShowcase });
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

  // Pantalla de onboarding si no es creador
  if (!isCreator) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #fdf4ff 0%, #f5f3ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 20px 60px rgba(139,92,246,0.15)', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <Video style={{ width: '36px', height: '36px', color: '#fff' }} />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#111', marginBottom: '8px' }}>
            Monetiza tu influencia
          </h2>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '28px', lineHeight: 1.6 }}>
            Únete al programa de Afiliados de EnviosVibe. Crea contenido, etiqueta productos y gana comisiones por cada venta.
          </p>

          <ul style={{ textAlign: 'left', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: '✨', text: 'Sin inventario ni envíos — nosotros lo manejamos todo' },
              { icon: '💰', text: 'Comisiones automáticas del 5-30% por venta' },
              { icon: '📱', text: 'Totalmente integrado en el feed de Vibe' },
              { icon: '📊', text: 'Dashboard con tus estadísticas en tiempo real' },
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#374151' }}>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleBecomeCreator}
            disabled={loading || !user}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '16px',
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              cursor: loading || !user ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
              transition: 'opacity 0.2s',
              opacity: loading || !user ? 0.7 : 1
            }}
          >
            {loading ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : null}
            {!user ? 'Inicia sesión primero' : loading ? 'Activando...' : 'Convertirme en Creador →'}
          </button>

          {!user && (
            <p style={{ marginTop: '16px', fontSize: '13px', color: '#9ca3af' }}>
              <Link to="/login" style={{ color: '#8b5cf6', fontWeight: 700 }}>Inicia sesión</Link> para unirte al programa
            </p>
          )}
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Dashboard de Creador activo
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
        padding: '24px 20px 32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '160px', height: '160px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.8)' }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>Centro de Creadores</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 900, marginBottom: '2px' }}>
            Hola, {displayName || 'Creador'} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            {showcase.length} producto{showcase.length !== 1 ? 's' : ''} en tu vitrina
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px' }}>
          {[
            { icon: <DollarSign style={{ width: '16px', height: '16px', color: '#22c55e' }} />, label: 'Ganancias', value: '$0.00' },
            { icon: <PlayCircle style={{ width: '16px', height: '16px', color: '#f9a8d4' }} />, label: 'Videos', value: '0' },
            { icon: <TrendingUp style={{ width: '16px', height: '16px', color: '#93c5fd' }} />, label: 'Clics', value: '0' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '12px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                {stat.icon}
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 600 }}>{stat.label}</span>
              </div>
              <p style={{ color: '#fff', fontSize: '20px', fontWeight: 900, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 16px' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #f0f0f0',
          marginTop: '16px',
          gap: '8px'
        }}>
          {[
            { id: 'marketplace', label: 'Mercado de Afiliados', count: affiliateProducts.length },
            { id: 'showcase', label: 'Mi Vitrina', count: showcase.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                paddingBottom: '10px',
                fontWeight: 700,
                fontSize: '14px',
                color: activeTab === tab.id ? '#8b5cf6' : '#9ca3af',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {tab.label}
              <span style={{
                background: activeTab === tab.id ? '#8b5cf6' : '#f3f4f6',
                color: activeTab === tab.id ? '#fff' : '#6b7280',
                borderRadius: '20px',
                padding: '1px 7px',
                fontSize: '11px',
                fontWeight: 700
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Mercado de Afiliados */}
        {activeTab === 'marketplace' && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Buscar productos con comisión..."
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
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {loadingProducts ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
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
                  No hay productos disponibles con programa de afiliados aún.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredProducts.map(p => {
                  const isAdded = showcase.includes(p.id);
                  const price = p.salePrice2 || p.salePrice1 || 0;
                  const commission = p.commissionRate || 0;
                  const earn = ((price * commission) / 100).toFixed(2);

                  return (
                    <div key={p.id} style={{
                      background: '#fff',
                      borderRadius: '16px',
                      border: '1px solid #f0f0f0',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={getImageUrl(p.imageUrl) || '/placeholder.png'}
                          alt={p.name}
                          style={{ width: '100%', height: '160px', objectFit: 'cover', background: '#f9fafb' }}
                        />
                        <div style={{
                          position: 'absolute', top: '10px', right: '10px',
                          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                          color: '#fff',
                          borderRadius: '20px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          Gana {commission}%
                        </div>
                      </div>

                      <div style={{ padding: '14px' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#111', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontWeight: 800, fontSize: '16px', color: '#7c3aed' }}>${price.toFixed(2)}</span>
                          <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>
                            +${earn} por venta
                          </span>
                        </div>

                        <button
                          onClick={() => toggleShowcase(p.id)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: isAdded ? '#f5f3ff' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                            color: isAdded ? '#7c3aed' : '#fff',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isAdded
                            ? <><CheckCircle style={{ width: '14px', height: '14px' }} /> En tu Vitrina</>
                            : <><PlusCircle style={{ width: '14px', height: '14px' }} /> Añadir a Vitrina</>
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
                border: '1px solid #f0f0f0'
              }}>
                <div style={{
                  width: '64px', height: '64px',
                  background: '#f5f3ff',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <ListPlus style={{ width: '28px', height: '28px', color: '#8b5cf6' }} />
                </div>
                <h3 style={{ fontWeight: 800, color: '#111', fontSize: '18px', marginBottom: '8px' }}>
                  Tu vitrina está vacía
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '14px', maxWidth: '300px', margin: '0 auto 24px' }}>
                  Ve al Mercado de Afiliados y añade los productos que quieras promocionar
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
                  Explorar Mercado <ArrowRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px', fontWeight: 600 }}>
                  {showcase.length} producto{showcase.length !== 1 ? 's' : ''} en tu vitrina. Pronto podrás etiquetarlos en tus videos Vibe.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {showcase.map(id => {
                    const p = affiliateProducts.find(a => a.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} style={{
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #f0f0f0',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <img
                          src={getImageUrl(p.imageUrl) || '/placeholder.png'}
                          alt={p.name}
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', background: '#f9fafb' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '13px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </p>
                          <button
                            onClick={() => toggleShowcase(id)}
                            style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
