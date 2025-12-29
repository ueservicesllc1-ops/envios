import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Filter, Package, X, Upload, Download, RefreshCw, Globe, EyeOff, Percent, Save, Wrench } from 'lucide-react';
import { Perfume } from '../types';
import { perfumeService } from '../services/perfumeService';
import { shopifyService } from '../services/shopifyService';
import { perfumeSettingsService } from '../services/perfumeSettingsService';
import toast from 'react-hot-toast';

const Perfumes: React.FC = () => {
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [filteredPerfumes, setFilteredPerfumes] = useState<Perfume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPerfume, setEditingPerfume] = useState<Perfume | null>(null);
  const [viewingPerfume, setViewingPerfume] = useState<Perfume | null>(null);
  const [importing, setImporting] = useState(false);
  const [showBrandManagement, setShowBrandManagement] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponActive, setCouponActive] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [fixingImages, setFixingImages] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    collection: '',
    sku: '',
    price: 0,
    imageUrl: '',
    isActive: true
  });

  useEffect(() => {
    loadPerfumes();
    loadGlobalDiscount();
    // Importar automáticamente de Shopify al cargar la página
    importFromShopifyAutomatically();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGlobalDiscount = async () => {
    try {
      const settings = await perfumeSettingsService.getSettings();
      setGlobalDiscount(settings.globalDiscountPercentage || 0);
      setCouponCode(settings.couponCode || '');
      setCouponDiscount(settings.couponDiscountPercentage || 0);
      setCouponActive(settings.couponActive || false);
    } catch (error) {
      console.error('Error loading global discount:', error);
    }
  };

  const handleSaveDiscounts = async () => {
    try {
      setSavingDiscount(true);
      const settings = await perfumeSettingsService.getSettings();
      await perfumeSettingsService.saveSettings({
        ...settings,
        globalDiscountPercentage: globalDiscount,
        couponCode: couponCode.trim(),
        couponDiscountPercentage: couponDiscount,
        couponActive: couponActive
      });
      toast.success('Configuración de descuentos guardada exitosamente');
    } catch (error) {
      console.error('Error saving discounts:', error);
      toast.error('Error al guardar la configuración de descuentos');
    } finally {
      setSavingDiscount(false);
    }
  };

  const importFromShopifyAutomatically = async () => {
    try {
      // Verificar si ya hay perfumes importados para evitar duplicados
      const existingPerfumes = await perfumeService.getAll();

      // Si ya hay perfumes, no importar automáticamente (solo la primera vez)
      if (existingPerfumes.length > 0) {
        console.log('Ya hay perfumes en la base de datos, omitiendo importación automática');
        return;
      }

      console.log('Iniciando importación automática de Shopify...');
      setImporting(true);
      toast.loading('Raspando y importando productos de Shopify automáticamente...', { id: 'auto-import' });

      // Obtener productos de la colección "all" (con upload de imágenes a B2)
      const processedPerfumes = await shopifyService.getProductsFromCollection('all', true);

      if (processedPerfumes.length === 0) {
        toast.error('No se encontraron productos en Shopify', { id: 'auto-import' });
        setImporting(false);
        return;
      }

      toast.loading(`Guardando ${processedPerfumes.length} perfumes en Firestore...`, { id: 'auto-import' });

      // Los perfumes ya vienen procesados del backend, solo necesitamos remover los IDs de Shopify
      const perfumesToImport = processedPerfumes.map(perfume => {
        const { shopifyProductId, shopifyVariantId, ...perfumeData } = perfume;
        return perfumeData;
      });

      // Crear perfumes en batch
      await perfumeService.createBatch(perfumesToImport);

      toast.success(`${perfumesToImport.length} perfumes importados automáticamente`, { id: 'auto-import' });
      await loadPerfumes();
    } catch (error) {
      console.error('Error en importación automática:', error);
      toast.error('Error al importar productos de Shopify automáticamente', { id: 'auto-import' });
      toast.error('Error al importar productos de Shopify automáticamente', { id: 'auto-import' });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    filterPerfumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedBrand, selectedCollection, perfumes]);

  const loadPerfumes = async () => {
    try {
      setLoading(true);
      const data = await perfumeService.getAll();
      setPerfumes(data);
    } catch (error) {
      console.error('Error loading perfumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPerfumes = () => {
    let filtered = perfumes;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por marca
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Filtrar por colección
    if (selectedCollection !== 'all') {
      filtered = filtered.filter(p => p.collection === selectedCollection);
    }

    setFilteredPerfumes(filtered);
  };

  const brands = Array.from(new Set(perfumes.map(p => p.brand).filter(Boolean))).sort();
  const collections = Array.from(new Set(perfumes.map(p => p.collection).filter(Boolean))).sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPerfume) {
        await perfumeService.update(editingPerfume.id, formData);
        setPerfumes(perfumes.map(p => p.id === editingPerfume.id ? { ...p, ...formData } : p));
      } else {
        const id = await perfumeService.create(formData);
        setPerfumes([{ ...formData, id, createdAt: new Date(), updatedAt: new Date() } as Perfume, ...perfumes]);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving perfume:', error);
    }
  };

  const handleEdit = (perfume: Perfume) => {
    setEditingPerfume(perfume);
    setFormData({
      name: perfume.name,
      description: perfume.description || '',
      brand: perfume.brand,
      collection: perfume.collection || '',
      sku: perfume.sku,
      price: perfume.price,
      imageUrl: perfume.imageUrl || '',
      isActive: perfume.isActive
    });
    setShowModal(true);
  };

  const handleTogglePublish = async (perfume: Perfume) => {
    try {
      await perfumeService.update(perfume.id, { isActive: !perfume.isActive });
      setPerfumes(perfumes.map(p =>
        p.id === perfume.id ? { ...p, isActive: !p.isActive } : p
      ));
      toast.success(perfume.isActive ? 'Perfume despublicado' : 'Perfume publicado');
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const handleToggleBrandPublish = async (brand: string) => {
    try {
      const brandPerfumes = perfumes.filter(p => p.brand === brand);
      const allPublished = brandPerfumes.every(p => p.isActive);
      const newStatus = !allPublished;

      // Actualizar todos los perfumes de la marca
      const updatePromises = brandPerfumes.map(perfume =>
        perfumeService.update(perfume.id, { isActive: newStatus })
      );

      await Promise.all(updatePromises);

      // Actualizar el estado local
      setPerfumes(perfumes.map(p =>
        p.brand === brand ? { ...p, isActive: newStatus } : p
      ));

      toast.success(
        newStatus
          ? `${brandPerfumes.length} perfumes de ${brand} publicados`
          : `${brandPerfumes.length} perfumes de ${brand} despublicados`
      );
    } catch (error) {
      console.error('Error toggling brand publish:', error);
      toast.error('Error al actualizar la marca');
    }
  };

  // Obtener estadísticas por marca
  const brandStats = brands.map(brand => {
    const brandPerfumes = perfumes.filter(p => p.brand === brand);
    const publishedCount = brandPerfumes.filter(p => p.isActive).length;
    const allPublished = brandPerfumes.length > 0 && publishedCount === brandPerfumes.length;
    const somePublished = publishedCount > 0 && publishedCount < brandPerfumes.length;

    return {
      brand,
      total: brandPerfumes.length,
      published: publishedCount,
      allPublished,
      somePublished
    };
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este perfume?')) {
      return;
    }
    try {
      await perfumeService.delete(id);
      setPerfumes(perfumes.filter(p => p.id !== id));
      toast.success('Perfume eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting perfume:', error);
    }
  };

  const handleImportFromShopify = async () => {
    if (!window.confirm('¿Importar todos los productos de Shopify? Esto puede tardar varios minutos y subirá las imágenes a Backblaze B2.')) {
      return;
    }

    try {
      setImporting(true);
      toast.loading('Raspando productos de Shopify y subiendo imágenes...', { id: 'import' });

      // Obtener productos de la colección "all" (con upload de imágenes a B2)
      const processedPerfumes = await shopifyService.getProductsFromCollection('all', true);

      if (processedPerfumes.length === 0) {
        toast.error('No se encontraron productos en Shopify', { id: 'import' });
        setImporting(false);
        return;
      }

      toast.loading(`Guardando ${processedPerfumes.length} perfumes en Firestore...`, { id: 'import' });

      // Los perfumes ya vienen procesados del backend, solo necesitamos remover los IDs de Shopify
      const perfumesToImport = processedPerfumes.map(perfume => {
        const { shopifyProductId, shopifyVariantId, ...perfumeData } = perfume;
        return perfumeData;
      });

      // Crear perfumes en batch
      await perfumeService.createBatch(perfumesToImport);

      toast.success(`${perfumesToImport.length} perfumes importados exitosamente`, { id: 'import' });
      await loadPerfumes();
    } catch (error) {
      console.error('Error importing from Shopify:', error);
      toast.error('Error al importar productos de Shopify', { id: 'import' });
    } finally {
      setImporting(false);
    }
  };

  const handleFixImages = async () => {
    // Filtrar productos con imágenes de Shopify
    const perfumesToFix = perfumes.filter(p =>
      p.imageUrl && (p.imageUrl.includes('cdn.shopify.com') || p.imageUrl.includes('shopify'))
    );

    if (perfumesToFix.length === 0) {
      toast.success('No se encontraron imágenes de Shopify para arreglar');
      return;
    }

    if (!window.confirm(`Se encontraron ${perfumesToFix.length} perfumes con imágenes de Shopify. ¿Deseas subirlas a B2 para asegurar que se muestren correctamente? Esto puede tardar unos minutos.`)) {
      return;
    }

    try {
      setFixingImages(true);
      let fixed = 0;
      let errors = 0;
      const total = perfumesToFix.length;

      for (let i = 0; i < total; i++) {
        const perfume = perfumesToFix[i];
        toast.loading(`Arreglando ${i + 1}/${total}: ${perfume.name.substring(0, 20)}...`, { id: 'fix-images' });

        try {
          // Subir a B2
          const newUrl = await shopifyService.uploadImageFromUrl(perfume.imageUrl!, perfume.brand, perfume.name);

          // Actualizar en Firestore
          await perfumeService.update(perfume.id, { imageUrl: newUrl });

          // Actualizar estado local
          setPerfumes(prev => prev.map(p =>
            p.id === perfume.id ? { ...p, imageUrl: newUrl } : p
          ));

          fixed++;
          // Pequeña pausa para no saturar
          await new Promise(r => setTimeout(r, 500));
        } catch (error) {
          console.error(`Error fixing image for ${perfume.name}:`, error);
          errors++;
        }
      }

      toast.success(`Proceso completado: ${fixed} arregladas, ${errors} errores`, { id: 'fix-images' });
    } catch (error) {
      console.error('Error in fix images process:', error);
      toast.error('Error en el proceso de arreglo de imágenes', { id: 'fix-images' });
    } finally {
      setFixingImages(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      brand: '',
      collection: '',
      sku: '',
      price: 0,
      imageUrl: '',
      isActive: true
    });
    setEditingPerfume(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 px-2 sm:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Perfumes</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestiona perfumes (productos de pedido, no integrados al inventario)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:space-x-3 sm:gap-0">
          {importing && (
            <div className="text-xs sm:text-sm text-blue-600 bg-blue-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border border-blue-200 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
              <span className="hidden sm:inline">Importando productos de Shopify automáticamente...</span>
              <span className="sm:hidden">Importando...</span>
            </div>
          )}
          <button
            onClick={handleFixImages}
            disabled={fixingImages || importing}
            className="btn-secondary flex items-center space-x-2 text-sm sm:text-base text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100"
            title="Arreglar imágenes que no se muestran"
          >
            {fixingImages ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Arreglar Imágenes</span>
            <span className="sm:hidden">Fix</span>
          </button>
          <button
            onClick={() => setShowBrandManagement(!showBrandManagement)}
            className="btn-secondary flex items-center space-x-2 text-sm sm:text-base"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Gestión de Marcas</span>
            <span className="sm:hidden">Marcas</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center space-x-2 text-sm sm:text-base"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Perfume</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Configuración de Descuentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Descuento Global */}
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Percent className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Descuento Global</h3>
                <p className="text-xs text-gray-600">Aplica a todos los perfumes en la tienda</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="99"
                step="1"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 99))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-semibold"
                placeholder="0"
              />
              <span className="text-lg font-semibold text-gray-700">%</span>
            </div>
          </div>
        </div>

        {/* Cupón de Descuento */}
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Percent className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cupón de Descuento</h3>
                <p className="text-xs text-gray-600">Descuento adicional activado en checkout</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Código del Cupón</label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                  placeholder="Ej: DESCUENTO20"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                  value={couponDiscount}
                  onChange={(e) => setCouponDiscount(Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 99))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-lg font-semibold"
                  placeholder="0"
                />
                <span className="text-lg font-semibold text-gray-700">%</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={couponActive}
                  onChange={(e) => setCouponActive(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label className="text-sm font-medium text-gray-700">Cupón activo</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveDiscounts}
          disabled={savingDiscount}
          className="btn-primary flex items-center space-x-2"
        >
          {savingDiscount ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Guardar Configuración de Descuentos</span>
            </>
          )}
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar perfumes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="input-field"
            >
              <option value="all">Todas las marcas</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colección</label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="input-field"
            >
              <option value="all">Todas las colecciones</option>
              {collections.map(collection => (
                <option key={collection} value={collection}>{collection}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBrand('all');
                setSelectedCollection('all');
              }}
              className="btn-secondary w-full"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Perfumes</p>
              <p className="text-2xl font-bold text-gray-900">{perfumes.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {perfumes.filter(p => p.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Filter className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Marcas</p>
              <p className="text-2xl font-bold text-gray-900">{brands.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Filter className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Colecciones</p>
              <p className="text-2xl font-bold text-gray-900">{collections.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Marcas */}
      {showBrandManagement && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Gestión de Marcas</h2>
            <button
              onClick={() => setShowBrandManagement(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {brandStats.map(({ brand, total, published, allPublished, somePublished }) => (
              <div
                key={brand}
                className={`border rounded-lg p-3 flex items-center justify-between ${allPublished
                  ? 'bg-green-50 border-green-200'
                  : somePublished
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{brand}</h3>
                  <p className="text-xs text-gray-600">
                    {published} / {total} publicados
                  </p>
                </div>
                <button
                  onClick={() => handleToggleBrandPublish(brand)}
                  className={`ml-2 p-2 rounded transition-colors ${allPublished
                    ? 'text-green-600 hover:bg-green-100'
                    : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  title={allPublished ? 'Despublicar todos' : 'Publicar todos'}
                >
                  {allPublished ? (
                    <Globe className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de Perfumes - Desktop */}
      <div className="card p-2 hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-14">Img</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-48">Nombre</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-24">Marca</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-20">Colección</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-20">SKU</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-20">Precio</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16">Pub</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPerfumes.map((perfume) => (
                <tr key={perfume.id} className="hover:bg-gray-50">
                  <td className="px-1 py-1 whitespace-nowrap w-14">
                    {perfume.imageUrl ? (
                      <img
                        src={perfume.imageUrl}
                        alt={perfume.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <Package className="h-10 w-10 text-gray-400" />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-xs font-medium text-gray-900 line-clamp-2">{perfume.name}</span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-xs text-gray-900">{perfume.brand}</span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-xs text-gray-900">{perfume.collection || '—'}</span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-xs text-gray-900 truncate block max-w-20">{perfume.sku}</span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-xs font-medium text-gray-900">
                      ${perfume.price.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <button
                      onClick={() => handleTogglePublish(perfume)}
                      className={`p-1.5 rounded transition-colors ${perfume.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      title={perfume.isActive ? 'Despublicar' : 'Publicar'}
                    >
                      {perfume.isActive ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setViewingPerfume(perfume)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Ver detalles"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(perfume)}
                        className="p-1 text-gray-400 hover:text-yellow-600"
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(perfume.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards de Perfumes - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredPerfumes.map((perfume) => (
          <div key={perfume.id} className="card">
            <div className="flex items-start space-x-3">
              <div className="h-20 w-20 flex-shrink-0">
                {perfume.imageUrl ? (
                  <img
                    src={perfume.imageUrl}
                    alt={perfume.name}
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{perfume.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-600">Marca: <span className="font-medium text-gray-900">{perfume.brand}</span></span>
                      {perfume.collection && (
                        <span className="text-xs text-gray-600">• Colección: <span className="font-medium text-gray-900">{perfume.collection}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => handleTogglePublish(perfume)}
                      className={`p-1.5 rounded transition-colors ${perfume.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      {perfume.isActive ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">SKU:</span>
                    <span className="text-gray-900 font-medium">{perfume.sku}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Precio:</span>
                    <span className="text-gray-900 font-semibold">${perfume.price.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-1">
                  <button
                    onClick={() => setViewingPerfume(perfume)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(perfume)}
                    className="p-1.5 text-gray-400 hover:text-yellow-600 rounded"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(perfume.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPerfumes.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay perfumes</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedBrand !== 'all' || selectedCollection !== 'all'
              ? 'No se encontraron perfumes con ese criterio.'
              : 'Comienza importando perfumes de Shopify o creando uno nuevo.'}
          </p>
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPerfume ? 'Editar Perfume' : 'Nuevo Perfume'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Nombre del perfume"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="Descripción del perfume"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="input-field"
                    placeholder="Ej: Arabiyat, Lattafa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colección
                  </label>
                  <input
                    type="text"
                    value={formData.collection}
                    onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                    className="input-field"
                    placeholder="Ej: Sugar, Prestige"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="input-field"
                    placeholder="Código SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Precio de venta en la tienda</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Imagen
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Activo (visible en tienda)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingPerfume ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ver Detalles */}
      {viewingPerfume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Detalles del Perfume</h3>
              <button
                onClick={() => setViewingPerfume(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {viewingPerfume.imageUrl && (
                <div className="flex justify-center">
                  <img
                    src={viewingPerfume.imageUrl}
                    alt={viewingPerfume.name}
                    className="h-64 w-64 object-contain rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingPerfume.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingPerfume.brand}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colección</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingPerfume.collection || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingPerfume.sku}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                  <p className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded">
                    ${viewingPerfume.price.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewingPerfume.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {viewingPerfume.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {viewingPerfume.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: viewingPerfume.description || '' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setViewingPerfume(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfumes;

