import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db, storage } from '../firebase/config';
import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Video, Music, Check, Loader2, Sparkles, UploadCloud, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUtils';

interface AffiliateProduct {
  id: string;
  name: string;
  imageUrl?: string;
  salePrice1?: number;
  salePrice2?: number;
}

export default function VibeVideoUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [showcase, setShowcase] = useState<string[]>([]);
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [pendingCaptureAction, setPendingCaptureAction] = useState<'record' | 'upload' | null>(null);
  const [recordDuration, setRecordDuration] = useState<number>(15);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load showcase products
  useEffect(() => {
    if (!user) return;
    const loadShowcase = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'userPreferences', user.uid));
        let showcaseIds: string[] = [];
        if (userSnap.exists()) {
          showcaseIds = userSnap.data().showcase || [];
          setShowcase(showcaseIds);
        }

        if (showcaseIds.length > 0) {
          // Simplification for MVP: load all and filter in memory
          const prodSnap = await getDocs(collection(db, 'products'));
          const allProds = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateProduct));
          const myProds = allProds.filter(p => showcaseIds.includes(p.id));
          setProducts(myProds);
          if (myProds.length > 0) setSelectedProductId(myProds[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadShowcase();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate size (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('El video no debe superar los 50MB');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handlePost = async () => {
    if (!file) {
      toast.error('Por favor selecciona o graba un video');
      return;
    }
    if (!selectedProductId) {
      toast.error('Debes etiquetar al menos un producto de tu Vitrina');
      return;
    }
    if (!user) return;

    setUploading(true);
    try {
      // 1. Upload to Storage
      const extension = file.name.split('.').pop() || 'mp4';
      const storageRef = ref(storage, `vibe_videos/${user.uid}/${Date.now()}.${extension}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          console.error(error);
          toast.error('Error al subir el video');
          setUploading(false);
        },
        async () => {
          // 2. Get URL and Save to Firestore
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          await addDoc(collection(db, 'vibeVideos'), {
            videoUrl: downloadUrl,
            description,
            sellerId: user.uid,
            taggedProductId: selectedProductId,
            likes: 0,
            comments: 0,
            shares: 0,
            createdAt: serverTimestamp(),
            status: 'active'
          });

          toast.success('¡Video publicado exitosamente!');
          navigate('/seller');
        }
      );
    } catch (e) {
      console.error(e);
      toast.error('Error procesando la publicación');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* Hidden inputs */}
      <input 
        type="file" 
        accept="video/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="video/*" 
        capture="user" 
        ref={cameraInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Top App Bar */}
      <header className="absolute top-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center px-4 h-16">
        <button onClick={() => navigate(-1)} className="text-white p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg">Publicar Vibe</span>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      {/* Video Preview Area */}
      <section className="relative flex-1 h-full w-full bg-gray-900 flex flex-col items-center justify-center">
        {previewUrl ? (
          <>
            <video 
              src={previewUrl} 
              className="h-full w-full object-cover" 
              autoPlay 
              loop 
              muted 
              playsInline
            />
            <button 
              onClick={() => setFile(null)}
              className="absolute top-20 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/20"
            >
              Cambiar
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <Video className="w-10 h-10 text-white/60" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Crea tu próximo Vibe</h2>
              <p className="text-gray-400 text-sm max-w-xs">Graba o sube un video mostrando tus productos. Máximo 50MB.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              
              {/* Selector de Tiempo TikTok Style */}
              <div className="flex justify-center gap-6 mb-2">
                {[15, 30, 60].map(time => (
                  <button 
                    key={time}
                    onClick={() => setRecordDuration(time)}
                    className={`font-bold text-sm transition-colors ${recordDuration === time ? 'text-white drop-shadow-md' : 'text-white/40'}`}
                  >
                    {time}s
                  </button>
                ))}
              </div>

              <button 
                onClick={() => {
                  setPendingCaptureAction('record');
                  setShowProductModal(true);
                }}
                className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" /> Grabar Video
              </button>
              <button 
                onClick={() => {
                  setPendingCaptureAction('upload');
                  setShowProductModal(true);
                }}
                className="w-full bg-white/10 text-white font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 border border-white/10"
              >
                <UploadCloud className="w-5 h-5" /> Subir de Galería
              </button>
            </div>
          </div>
        )}

        {/* Overlay gradient for bottom controls visibility */}
        {previewUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        )}
      </section>

      {/* Configuration Sidebar / Bottom Sheet */}
      <aside className={`absolute bottom-0 md:relative md:bottom-auto w-full md:w-[400px] bg-gray-900/95 backdrop-blur-xl md:border-l border-white/10 flex flex-col transition-transform duration-300 ${(previewUrl || showProductModal) ? 'translate-y-0 h-[65vh] md:h-full rounded-t-2xl md:rounded-none' : 'translate-y-full md:translate-y-0 h-0 md:h-full overflow-hidden'}`}>
        
        {/* Mobile handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full self-center my-3 md:hidden flex-shrink-0" />

        {showProductModal ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="font-bold">Elegir Producto</h3>
              <button onClick={() => {
                setShowProductModal(false);
                setPendingCaptureAction(null);
              }} className="text-gray-400 font-bold text-sm">Cerrar</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3 no-scrollbar pb-6">
              {products.map(p => (
                <div 
                  key={p.id}
                  onClick={() => { 
                    setSelectedProductId(p.id); 
                    setShowProductModal(false); 
                    
                    // Trigger camera/file dialog if there's a pending action
                    if (pendingCaptureAction === 'record') {
                      setTimeout(() => cameraInputRef.current?.click(), 300);
                    } else if (pendingCaptureAction === 'upload') {
                      setTimeout(() => fileInputRef.current?.click(), 300);
                    }
                    setPendingCaptureAction(null);
                  }}
                  className="group cursor-pointer flex flex-col gap-1"
                >
                  <div className={`aspect-square w-full rounded-xl overflow-hidden relative border-2 transition-all ${selectedProductId === p.id ? 'border-orange-500' : 'border-white/10 bg-white/5'}`}>
                    <img 
                      src={getImageUrl(p.imageUrl) || '/placeholder.png'} 
                      className="w-full h-full object-cover bg-white" 
                      alt={p.name}
                    />
                    {selectedProductId === p.id && (
                      <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-orange-500 rounded-full p-1 shadow-lg">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className={`text-[10px] font-bold truncate text-center ${selectedProductId === p.id ? 'text-orange-500' : 'text-gray-400'}`}>
                    {p.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar pb-24">
              
              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe tu video y usa hashtags..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none h-24"
                  maxLength={150}
                />
                <div className="text-right text-xs text-gray-500">{description.length}/150</div>
              </div>

              {/* Product Tagging Button */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" /> Etiquetar Producto
                </label>
                
                {products.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                    <p className="text-sm text-gray-400 mb-2">No tienes productos en tu Vitrina</p>
                    <button 
                      onClick={() => navigate('/seller')}
                      className="text-orange-500 font-bold text-sm underline"
                    >
                      Ir al catálogo
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowProductModal(true)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors text-left"
                  >
                    {selectedProductId ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={getImageUrl(products.find(p => p.id === selectedProductId)?.imageUrl) || '/placeholder.png'} 
                          className="w-10 h-10 rounded-lg object-cover bg-white" 
                          alt="Selected"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{products.find(p => p.id === selectedProductId)?.name}</p>
                          <p className="text-[10px] text-orange-500">Cambiar producto</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-400">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold">Seleccionar de Vitrina ({products.length})</span>
                      </div>
                    )}
                  </button>
                )}
              </div>

            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 w-full p-4 bg-gray-900 border-t border-white/10 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
              <button 
                onClick={handlePost}
                disabled={uploading || !file || !selectedProductId}
                className={`w-full font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all ${
                  uploading || !file || !selectedProductId 
                    ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                    : 'bg-orange-600 text-white active:scale-95 shadow-lg shadow-orange-600/20'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Subiendo {Math.round(progress)}%
                  </>
                ) : (
                  'Publicar Video'
                )}
              </button>
            </div>
          </>
        )}

      </aside>
    </div>
  );
}
