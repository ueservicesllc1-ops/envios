import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, ShoppingCart, Loader2, Search } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import VibeMobileNav from '../components/vibe/VibeMobileNav';
import { getImageUrl } from '../utils/imageUtils';

interface FeedVideo {
  id: string;
  videoUrl: string;
  description: string;
  sellerId: string;
  taggedProductId: string;
  likes: number;
  comments: number;
  shares: number;
  // Hydrated data
  product?: any;
  sellerName?: string;
}

export default function VibeFeedPage() {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        const q = query(collection(db, 'vibeVideos'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const loadedVideos: FeedVideo[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as FeedVideo;
          const video: FeedVideo = { ...data, id: docSnap.id };
          
          // Hydrate product
          if (video.taggedProductId) {
            const productSnap = await getDoc(doc(db, 'products', video.taggedProductId));
            if (productSnap.exists()) {
              video.product = { id: productSnap.id, ...productSnap.data() };
            }
          }
          
          // Hydrate seller
          if (video.sellerId) {
            const userSnap = await getDoc(doc(db, 'userPreferences', video.sellerId));
            if (userSnap.exists()) {
              video.sellerName = userSnap.data().displayName || 'Influencer Vibe';
            }
          }
          
          loadedVideos.push(video);
        }
        
        setVideos(loadedVideos);
      } catch (error) {
        console.error("Error loading Vibe videos:", error);
      } finally {
        setLoading(false);
      }
    }
    loadVideos();
  }, []);

  const handleScroll = () => {
    if (containerRef.current) {
      const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    }
  };

  const handleProductClick = (video: FeedVideo) => {
    if (!video.product) return;
    navigate(`/product/${video.product.id}?aff=${video.sellerId}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col md:flex-row">
      
      {/* Top Navigation (TikTok Style) */}
      <div className="absolute top-0 left-0 w-full z-50 pt-safe bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex justify-between items-center px-4 h-16 pointer-events-auto">
          <div className="w-8" /> {/* Spacer */}
          <div className="flex gap-4 font-bold text-lg drop-shadow-md">
            <Link to="/live" className="text-white/60 hover:text-white transition-colors">LIVE</Link>
            <span className="text-white relative">
              Para ti
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full"></div>
            </span>
          </div>
          <button onClick={() => navigate('/marketplace')} className="w-8 h-8 flex items-center justify-center active:scale-90 transition-transform">
            <Search className="w-6 h-6 text-white drop-shadow-md" />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 h-full relative max-w-md mx-auto bg-gray-900 w-full overflow-y-scroll no-scrollbar snap-y snap-mandatory"
      >
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : videos.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-white/40" />
            </div>
            <h2 className="text-xl font-bold mb-2">Aún no hay videos</h2>
            <p className="text-gray-400">Sé el primero en subir un video desde tu Panel de Vendedor.</p>
          </div>
        ) : (
          videos.map((video, index) => {
            const product = video.product;
            const title = product?.name || 'Producto';
            const price = product?.salePrice2 || product?.salePrice1 || 0;
            const image = product?.imageUrl ? getImageUrl(product.imageUrl) : '/placeholder.png';
            const isPlaying = index === currentIndex;

            return (
              <div key={video.id} className="h-[100dvh] w-full relative snap-start snap-always">
                
                {/* Video Player */}
                <video 
                  src={video.videoUrl} 
                  className="w-full h-full object-cover" 
                  autoPlay={isPlaying}
                  loop 
                  muted={false} // Autoplay on mobile requires muted sometimes, but TikTok style often starts unmuted if allowed
                  playsInline
                />
                
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />
                
                {/* Engagement Actions */}
                <div className="absolute right-4 bottom-28 flex flex-col items-center gap-6 z-10 pointer-events-auto">
                  <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                    <div className="bg-black/20 p-2 rounded-full backdrop-blur-md">
                      <Heart className="w-7 h-7 text-white group-hover:text-pink-500 transition-colors" /> 
                    </div>
                    <span className="text-xs font-bold drop-shadow-md">{video.likes || 0}</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                    <div className="bg-black/20 p-2 rounded-full backdrop-blur-md">
                      <MessageCircle className="w-7 h-7 text-white" /> 
                    </div>
                    <span className="text-xs font-bold drop-shadow-md">{video.comments || 0}</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                    <div className="bg-black/20 p-2 rounded-full backdrop-blur-md">
                      <Share2 className="w-7 h-7 text-white" /> 
                    </div>
                    <span className="text-xs font-bold drop-shadow-md">{video.shares || 0}</span>
                  </button>
                </div>

                {/* Video Info & Product Card */}
                <div className="absolute bottom-20 left-4 right-20 z-10 pointer-events-auto">
                  <h3 className="font-bold text-base mb-1 drop-shadow-md">@{video.sellerName || 'usuario'}</h3>
                  <p className="text-sm mb-4 drop-shadow-md line-clamp-2">{video.description}</p>
                  
                  {product && (
                    <button 
                      onClick={() => handleProductClick(video)}
                      className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-2 flex gap-3 items-center active:scale-95 transition-all text-left shadow-lg"
                    >
                      <img src={image} className="w-12 h-12 rounded-lg object-cover bg-white" alt={title} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm line-clamp-1 truncate">{title}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-orange-400 font-extrabold">${Number(price).toFixed(2)}</p>
                          <span className="bg-orange-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-md">
                            Comprar
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      <VibeMobileNav />
    </div>
  );
}
