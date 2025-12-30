import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Upload, Edit2, Image as ImageIcon, LogOut, User, Lock } from 'lucide-react';
import { storeSettingsService, type StoreSettings, type HeroSlide, type InfoBanner } from '../services/storeSettingsService';
import { storeEditorAccessService } from '../services/storeEditorAccessService';
import { storage, auth } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { productService } from '../services/productService';
import { Product } from '../types';
import toast from 'react-hot-toast';

const StoreEditor: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<StoreSettings | null>(null);
    const [activeTab, setActiveTab] = useState<'banners' | 'advertising' | 'products'>('banners');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            toast.error('Error al cerrar sesión');
        }
    };

    // Suscribirse a cambios de autenticación
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);

            // Verificar autorización
            if (currentUser?.email) {
                setCheckingAuth(true);
                const authorized = await storeEditorAccessService.isAuthorized(currentUser.email);
                setIsAuthorized(authorized);
                setCheckingAuth(false);

                if (!authorized) {
                    toast.error('No tienes autorización para acceder a esta página');
                }
            } else {
                setIsAuthorized(false);
                setCheckingAuth(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!authLoading && isAuthorized) {
            loadSettings();
            loadProducts();
        }
    }, [authLoading, isAuthorized]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await storeSettingsService.getSettings();

            // Asegurar que advertisingBanners existe
            if (!data.advertisingBanners) {
                data.advertisingBanners = Array.from({ length: 12 }, (_, i) => ({
                    id: `ad-banner-${i + 1}`,
                    imageUrl: '',
                    enabled: false
                }));
            }

            setSettings(data);
        } catch (error) {
            toast.error('Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const data = await productService.getAll();
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await storeSettingsService.saveSettings(settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (window.confirm('¿Estás seguro de restablecer todas las configuraciones a los valores predeterminados?')) {
            try {
                await storeSettingsService.resetToDefaults();
                await loadSettings();
            } catch (error) {
                console.error('Error resetting settings:', error);
            }
        }
    };

    const handleImageUpload = async (file: File, slideId?: string): Promise<string> => {
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona un archivo de imagen');
            throw new Error('Invalid file type');
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB');
            throw new Error('File too large');
        }

        try {
            setUploadingImage(true);
            const imageRef = ref(storage, `store-banners/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(imageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            toast.success('Imagen subida correctamente');
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error al subir la imagen');
            throw error;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleProductImageUpload = async (file: File, product: Product) => {
        try {
            const imageUrl = await handleImageUpload(file);
            await productService.update(product.id, { imageUrl });
            toast.success('Imagen del producto actualizada');
            await loadProducts();
            setSelectedProduct(null);
        } catch (error) {
            console.error('Error updating product image:', error);
        }
    };

    const updateSlide = (index: number, updates: Partial<HeroSlide>) => {
        if (!settings) return;
        const newSlides = [...settings.heroSlides];
        newSlides[index] = { ...newSlides[index], ...updates };
        setSettings({ ...settings, heroSlides: newSlides });
    };

    const updateInfoBanner = (index: number, updates: Partial<InfoBanner>) => {
        if (!settings) return;
        const newBanners = [...settings.infoBanners];
        newBanners[index] = { ...newBanners[index], ...updates };
        setSettings({ ...settings, infoBanners: newBanners });
    };

    // Pantalla de carga
    if (authLoading || checkingAuth) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Pantalla de acceso denegado
    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="h-10 w-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
                        <p className="text-gray-600 mb-6">
                            No tienes autorización para acceder al Editor de Tienda.
                        </p>
                        {user && (
                            <p className="text-sm text-gray-500 mb-6">
                                Usuario actual: <span className="font-medium">{user.email}</span>
                            </p>
                        )}
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/')}
                                className="btn-primary w-full"
                            >
                                Volver al Inicio
                            </button>
                            <button
                                onClick={handleLogout}
                                className="btn-secondary w-full"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-6">
                            Contacta al administrador si crees que deberías tener acceso
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5" />
                                <span className="hidden md:inline">Volver a la tienda</span>
                            </button>
                            <div className="border-l border-gray-300 h-8 hidden md:block"></div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Editor de Tienda</h1>
                                <p className="text-xs md:text-sm text-gray-600">Personaliza los elementos visuales de tu tienda en línea</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {user && (
                                <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 border-r pr-3 border-gray-300">
                                    <User className="h-4 w-4" />
                                    <span>{user.email}</span>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="btn-secondary flex items-center gap-2 text-sm"
                                title="Cerrar sesión"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden md:inline">Salir</span>
                            </button>
                            <button
                                onClick={handleReset}
                                className="btn-secondary flex items-center gap-2 text-sm"
                            >
                                <RotateCcw className="h-4 w-4" />
                                <span className="hidden md:inline">Restablecer</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary flex items-center gap-2 text-sm md:text-base"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('banners')}
                            className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'banners'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🎨 Banners Principales
                        </button>
                        <button
                            onClick={() => setActiveTab('advertising')}
                            className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'advertising'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📢 Cartillas Publicitarias
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'products'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🖼️ Imágenes de Productos
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {activeTab === 'banners' && (
                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-xl font-bold mb-4">Banner Promocional Superior</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Texto Principal</label>
                                    <input
                                        type="text"
                                        value={settings.promoBanner.text}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            promoBanner: { ...settings.promoBanner, text: e.target.value }
                                        })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Subtexto</label>
                                    <input
                                        type="text"
                                        value={settings.promoBanner.subtext}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            promoBanner: { ...settings.promoBanner, subtext: e.target.value }
                                        })}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </div>

                        {settings.heroSlides.map((slide, index) => (
                            <div key={slide.id} className="bg-white p-6 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold">Banner {index + 1}</h2>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={slide.enabled}
                                            onChange={(e) => updateSlide(index, { enabled: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Mostrar en carrusel</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del Banner</label>
                                    <p className="text-xs text-gray-500 mb-3">Sube una imagen horizontal para el carrusel (recomendado: 1400x387px)</p>
                                    <div className="flex flex-col gap-4">
                                        {slide.imageUrl && (
                                            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                                                <img src={slide.imageUrl} alt={`Banner ${index + 1}`} className="w-full h-auto object-cover" />
                                            </div>
                                        )}
                                        <label className="btn-primary cursor-pointer flex items-center justify-center gap-2 w-full md:w-auto">
                                            <Upload className="h-5 w-5" />
                                            {uploadingImage ? 'Subiendo...' : (slide.imageUrl ? 'Cambiar Imagen' : 'Subir Imagen')}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={uploadingImage}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            const url = await handleImageUpload(file, slide.id);
                                                            updateSlide(index, { imageUrl: url });
                                                        } catch (error) {
                                                            console.error('Error uploading image:', error);
                                                        }
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'advertising' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-xl font-bold mb-4">Cartillas Publicitarias</h2>
                            <p className="text-gray-600 mb-6">
                                Sube hasta 12 imágenes publicitarias. Se mostrarán aleatoriamente 4 de ellas entre las secciones de productos.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {settings.advertisingBanners?.map((banner, index) => (
                                    <div key={banner.id} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-gray-900">Imagen {index + 1}</h3>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={banner.enabled}
                                                    onChange={(e) => {
                                                        const newBanners = [...settings.advertisingBanners];
                                                        newBanners[index] = { ...banner, enabled: e.target.checked };
                                                        setSettings({ ...settings, advertisingBanners: newBanners });
                                                    }}
                                                    className="w-3 h-3"
                                                />
                                                <span className="text-xs text-gray-600">Activa</span>
                                            </label>
                                        </div>
                                        <div>
                                            {banner.imageUrl && (
                                                <div className="border border-gray-200 rounded overflow-hidden mb-2">
                                                    <img src={banner.imageUrl} alt={`Ad ${index + 1}`} className="w-full h-24 object-cover" />
                                                </div>
                                            )}
                                            <label className="btn-secondary cursor-pointer flex items-center justify-center gap-1 w-full text-xs py-2">
                                                <Upload className="h-3 w-3" />
                                                {uploadingImage ? 'Subiendo...' : (banner.imageUrl ? 'Cambiar' : 'Subir')}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    disabled={uploadingImage}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                const url = await handleImageUpload(file);
                                                                const newBanners = [...settings.advertisingBanners];
                                                                newBanners[index] = { ...banner, imageUrl: url, enabled: true };
                                                                setSettings({ ...settings, advertisingBanners: newBanners });
                                                            } catch (error) {
                                                                console.error('Error uploading image:', error);
                                                            }
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {activeTab === 'products' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm">
                            <h2 className="text-xl font-bold mb-4">Gestión de Imágenes de Productos</h2>
                            <p className="text-gray-600 mb-6">
                                Haz clic en un producto para cambiar o agregar su imagen principal
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {products.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setShowImageModal(true);
                                        }}
                                        className="border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <ImageIcon className="h-12 w-12 text-gray-400" />
                                            )}
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 h-10">
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                                        <button
                                            className="w-full mt-2 btn-secondary text-xs py-1 flex items-center justify-center gap-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProduct(product);
                                                setShowImageModal(true);
                                            }}
                                        >
                                            <Edit2 className="h-3 w-3" />
                                            {product.imageUrl ? 'Cambiar' : 'Agregar'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal para cambiar imagen de producto */}
            {showImageModal && selectedProduct && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowImageModal(false)}
                >
                    <div
                        className="bg-white rounded-lg max-w-lg w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold mb-4">Cambiar Imagen de Producto</h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Producto:</p>
                            <p className="font-medium">{selectedProduct.name}</p>
                        </div>

                        {selectedProduct.imageUrl && (
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Imagen Actual:</p>
                                <img
                                    src={selectedProduct.imageUrl}
                                    alt={selectedProduct.name}
                                    className="w-full h-48 object-contain bg-gray-100 rounded"
                                />
                            </div>
                        )}

                        <label className="btn-primary w-full cursor-pointer flex items-center justify-center gap-2">
                            <Upload className="h-5 w-5" />
                            {uploadingImage ? 'Subiendo...' : 'Seleccionar Nueva Imagen'}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingImage}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file && selectedProduct) {
                                        await handleProductImageUpload(file, selectedProduct);
                                        setShowImageModal(false);
                                    }
                                }}
                            />
                        </label>

                        <button
                            onClick={() => setShowImageModal(false)}
                            className="btn-secondary w-full mt-3"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreEditor;
