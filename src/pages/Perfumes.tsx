import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Filter, Package, X, Upload, Download, RefreshCw, Globe, EyeOff, Percent, Save, Wrench, Sparkles, ClipboardList, CheckCircle } from 'lucide-react';
import { Perfume } from '../types';
import { perfumeService } from '../services/perfumeService';
import { shopifyService } from '../services/shopifyService';
import { perfumeSettingsService } from '../services/perfumeSettingsService';
import { perfumeAdvisorClient } from '../services/perfumeAdvisorClient';
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
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [investigatingAi, setInvestigatingAi] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMode, setBatchMode] = useState<'inventory' | 'catalog'>('inventory');
  const [batchLimit, setBatchLimit] = useState<number>(10);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<string[]>([]);

  const [showRequestedModal, setShowRequestedModal] = useState(false);
  const [requestedItems, setRequestedItems] = useState<any[]>([]);
  const [loadingRequested, setLoadingRequested] = useState(false);

  const loadRequestedPerfumes = async () => {
    try {
      setLoadingRequested(true);
      setShowRequestedModal(true);
      const res = await perfumeAdvisorClient.getRequested();
      if (res.success) {
        setRequestedItems(res.items || []);
      }
    } catch (e) {
      console.error('Error loading requested perfumes:', e);
      toast.error('Error al cargar pedidos de clientes');
    } finally {
      setLoadingRequested(false);
    }
  };

  const handleUpdateRequestedStatus = async (id: string, status: string) => {
    try {
      await perfumeAdvisorClient.updateRequestStatus(id, status);
      toast.success('Estado actualizado');
      const res = await perfumeAdvisorClient.getRequested();
      if (res.success) setRequestedItems(res.items || []);
    } catch (e) {
      toast.error('Error al actualizar');
    }
  };

  const emptyFormData = {
    name: '',
    description: '',
    brand: '',
    collection: '',
    sku: '',
    price: 0,
    imageUrl: '',
    isActive: true,
    dupeOf: '',
    dupeBrand: '',
    olfactoryFamily: '',
    gender: 'Unisex',
    concentration: 'Eau de Parfum',
    notesTop: '',
    notesMiddle: '',
    notesBase: '',
    mainAccords: '',
    longevity: '',
    bestOccasion: '',
    salesPitch: ''
  };

  const [formData, setFormData] = useState(emptyFormData);

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
      const topNotes = formData.notesTop.split(',').map(s => s.trim()).filter(Boolean);
      const midNotes = formData.notesMiddle.split(',').map(s => s.trim()).filter(Boolean);
      const baseNotes = formData.notesBase.split(',').map(s => s.trim()).filter(Boolean);
      const accords = formData.mainAccords.split(',').map(s => s.trim()).filter(Boolean);

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        brand: formData.brand.trim(),
        collection: formData.collection.trim(),
        sku: formData.sku.trim(),
        price: Number(formData.price) || 0,
        imageUrl: formData.imageUrl.trim(),
        isActive: formData.isActive,
        dupeOf: formData.dupeOf.trim(),
        dupeBrand: formData.dupeBrand.trim(),
        olfactoryFamily: formData.olfactoryFamily.trim(),
        gender: formData.gender,
        concentration: formData.concentration.trim(),
        notes: {
          top: topNotes,
          middle: midNotes,
          base: baseNotes
        },
        mainAccords: accords,
        longevity: formData.longevity.trim(),
        bestOccasion: formData.bestOccasion.trim(),
        salesPitch: formData.salesPitch.trim(),
        aiEnriched: Boolean(formData.dupeOf || topNotes.length > 0 || formData.salesPitch),
        aiEnrichedAt: new Date().toISOString()
      };

      if (editingPerfume) {
        await perfumeService.update(editingPerfume.id, payload);
        setPerfumes(perfumes.map(p => p.id === editingPerfume.id ? { ...p, ...payload } : p));
        toast.success(`¡Perfume "${payload.name}" actualizado correctamente!`);
      } else {
        const id = await perfumeService.create(payload);
        const newPerfume = { ...payload, id, createdAt: new Date(), updatedAt: new Date() } as Perfume;
        setPerfumes([newPerfume, ...perfumes]);
        toast.success(`¡Perfume "${payload.name}" guardado exitosamente en Firestore!`);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving perfume:', error);
      toast.error('Error al guardar el perfume');
    }
  };

  const handleEdit = (perfume: Perfume) => {
    setEditingPerfume(perfume);
    const pAny = perfume as any;
    setFormData({
      name: perfume.name || '',
      description: perfume.description || '',
      brand: perfume.brand || '',
      collection: perfume.collection || '',
      sku: perfume.sku || '',
      price: perfume.price || 0,
      imageUrl: perfume.imageUrl || '',
      isActive: perfume.isActive !== false,
      dupeOf: pAny.dupeOf || '',
      dupeBrand: pAny.dupeBrand || '',
      olfactoryFamily: pAny.olfactoryFamily || '',
      gender: pAny.gender || 'Unisex',
      concentration: pAny.concentration || 'Eau de Parfum',
      notesTop: Array.isArray(pAny.notes?.top) ? pAny.notes.top.join(', ') : '',
      notesMiddle: Array.isArray(pAny.notes?.middle) ? pAny.notes.middle.join(', ') : '',
      notesBase: Array.isArray(pAny.notes?.base) ? pAny.notes.base.join(', ') : '',
      mainAccords: Array.isArray(pAny.mainAccords) ? pAny.mainAccords.join(', ') : '',
      longevity: pAny.longevity || '',
      bestOccasion: pAny.bestOccasion || '',
      salesPitch: pAny.salesPitch || ''
    });
    setShowModal(true);
  };

  const handleInvestigateAiPreview = async () => {
    if (!formData.name.trim() && !formData.sku.trim()) {
      toast.error('Por favor escribe al menos el nombre del perfume o SKU para investigar con IA');
      return;
    }

    try {
      setInvestigatingAi(true);
      toast.loading('Consultando a Gemini para investigar notas, acordes y equivalencia...', { id: 'ai-investigate' });

      const res = await perfumeAdvisorClient.investigatePreview({
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        sku: formData.sku.trim()
      });

      if (res.success && res.analysis) {
        const a = res.analysis;
        setFormData(prev => ({
          ...prev,
          name: prev.name || a.name || '',
          brand: prev.brand || a.brand || '',
          dupeOf: a.dupeOf || prev.dupeOf,
          dupeBrand: a.dupeBrand || prev.dupeBrand,
          olfactoryFamily: a.olfactoryFamily || prev.olfactoryFamily,
          gender: a.gender || prev.gender,
          concentration: a.concentration || prev.concentration,
          notesTop: Array.isArray(a.notes?.top) && a.notes.top.length > 0 ? a.notes.top.join(', ') : prev.notesTop,
          notesMiddle: Array.isArray(a.notes?.middle) && a.notes.middle.length > 0 ? a.notes.middle.join(', ') : prev.notesMiddle,
          notesBase: Array.isArray(a.notes?.base) && a.notes.base.length > 0 ? a.notes.base.join(', ') : prev.notesBase,
          mainAccords: Array.isArray(a.mainAccords) && a.mainAccords.length > 0 ? a.mainAccords.join(', ') : prev.mainAccords,
          longevity: a.longevity || prev.longevity,
          bestOccasion: a.bestOccasion || prev.bestOccasion,
          salesPitch: a.salesPitch || prev.salesPitch,
          description: prev.description || a.description || a.salesPitch || ''
        }));
        toast.success(`¡Perfume investigado con IA! Se autocompletaron las notas y la equivalencia.`, { id: 'ai-investigate' });
      } else {
        toast.error(res.error || 'No se encontró información para este perfume', { id: 'ai-investigate' });
      }
    } catch (err: any) {
      console.error('Error investigando perfume con IA:', err);
      toast.error('Error al conectar con Gemini Free Tier', { id: 'ai-investigate' });
    } finally {
      setInvestigatingAi(false);
    }
  };

  const handleRunBatchAi = async () => {
    try {
      setBatchRunning(true);
      setBatchResults([]);
      toast.loading(`Enriqueciendo ${batchLimit} perfumes (${batchMode === 'inventory' ? 'Inventario Físico' : 'Catálogo'})...`, { id: 'batch-ai' });
      const res = await perfumeAdvisorClient.syncPending(batchLimit, batchMode);
      if (res.success) {
        setBatchResults(res.details || []);
        toast.success(`¡${res.processed} perfumes enriquecidos exitosamente con IA!`, { id: 'batch-ai' });
        loadPerfumes();
      } else {
        toast.error(res.error || 'Error en el procesamiento por lote', { id: 'batch-ai' });
      }
    } catch (err: any) {
      toast.error('Error al conectar con el servidor', { id: 'batch-ai' });
    } finally {
      setBatchRunning(false);
    }
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

  const handleEnrichPerfume = async (perfume: Perfume) => {
    try {
      setEnrichingId(perfume.id);
      toast.loading(`Consultando IA Gemini para "${perfume.name}"...`, { id: `ai-${perfume.id}` });
      const res = await perfumeAdvisorClient.enrichOne(perfume.id);
      if (res.success && res.perfume) {
        setPerfumes(prev => prev.map(p => p.id === perfume.id ? { ...p, ...res.perfume } : p));
        toast.success(`¡Notas olfativas, dupe y descripción guardados en Firestore!`, { id: `ai-${perfume.id}` });
      } else {
        toast.error(res.error || 'No se pudo obtener información con IA', { id: `ai-${perfume.id}` });
      }
    } catch (err: any) {
      console.error('Error enriqueciendo perfume:', err);
      toast.error('Error al conectar con el servicio de IA', { id: `ai-${perfume.id}` });
    } finally {
      setEnrichingId(null);
    }
  };

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
    setFormData(emptyFormData);
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
          <button
            onClick={() => setShowBatchModal(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-lg flex items-center space-x-1.5 text-sm font-bold shadow transition-all"
            title="Investigar perfumes por lote con IA (Inventario o Catálogo)"
          >
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <span>✨ Investigar Catálogo con IA</span>
          </button>
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
            onClick={loadRequestedPerfumes}
            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3.5 py-2 rounded-lg flex items-center space-x-2 text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all"
            title="Ver perfumes solicitados por clientes que no teníamos en inventario"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="hidden sm:inline">Pedidos Clientes</span>
            <span className="sm:hidden">Pedidos</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all"
            title="Agregar un nuevo perfume al catálogo"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            <span>+ Agregar Nuevo Perfume</span>
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
                    {(perfume as any).dupeOf && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                        <Sparkles className="h-3 w-3 text-purple-600" /> Dupe de: {(perfume as any).dupeOf}
                      </span>
                    )}
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
                        onClick={() => handleEnrichPerfume(perfume)}
                        disabled={enrichingId === perfume.id}
                        className={`px-2.5 py-1 rounded text-xs font-bold flex items-center space-x-1 shadow-sm transition-all ${
                          (perfume as any).aiEnriched || (perfume as any).dupeOf
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                        }`}
                        title="Buscar notas olfativas y dupe con IA"
                      >
                        {enrichingId === perfume.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin text-purple-600" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-yellow-300" />
                        )}
                        <span>{(perfume as any).aiEnriched ? '✨ Notas IA' : '✨ IA Notas'}</span>
                      </button>
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
                    {(perfume as any).dupeOf && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          <Sparkles className="h-3 w-3 text-purple-600" /> Dupe de: {(perfume as any).dupeOf}
                        </span>
                      </div>
                    )}
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
                    onClick={() => handleEnrichPerfume(perfume)}
                    disabled={enrichingId === perfume.id}
                    className={`px-2.5 py-1 rounded text-xs font-bold flex items-center space-x-1 shadow-sm transition-all ${
                      (perfume as any).aiEnriched || (perfume as any).dupeOf
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                    title="Buscar notas con IA"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                    <span>IA</span>
                  </button>
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

      {/* Modal de Crear/Editar Perfume */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingPerfume ? 'Editar Perfume' : 'Agregar Nuevo Perfume'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Ingresa los datos o usa la IA para investigar y rellenar automáticamente notas, acordes y equivalencia.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Asistente Rápido de IA */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-xl p-3.5 sm:p-4 mb-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-purple-900 font-bold text-sm">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Asistente de Investigación con IA (Gemini Free Tier)</span>
                  </div>
                  <p className="text-xs text-purple-700">
                    Escribe el <strong>Nombre</strong> o <strong>SKU</strong> abajo y presiona el botón para completar todo en 2 segundos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInvestigateAiPreview}
                  disabled={investigatingAi || (!formData.name.trim() && !formData.sku.trim())}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Consultar pirámide olfativa y dupe con Gemini"
                >
                  <Sparkles className={`h-4 w-4 text-yellow-300 ${investigatingAi ? 'animate-spin' : ''}`} />
                  <span>{investigatingAi ? 'Investigando con Gemini...' : '✨ Investigar y Rellenar con IA'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Bloque 1: Datos Básicos */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-gray-600" /> Datos Comerciales
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nombre Comercial del Perfume *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Ej: Club De Nuit Intense Man, Khamrah, Yara..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Ej: Armaf, Lattafa, Afnan..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      SKU / Código de Barras *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Ej: PERF-00123"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Precio de Venta ($) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="input-field text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Colección (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.collection}
                      onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Ej: Oriental, Nicho, Premium"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      URL de Fotografía (Backblaze B2 o Web)
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="input-field text-sm"
                      placeholder="https://f005.backblazeb2.com/file/..."
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Equivalencia Olfativa / Dupe */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Equivalencia / Inspiración Comercial (Dupe)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      ¿Es Dupe / Inspiración de cuál perfume famoso?
                    </label>
                    <input
                      type="text"
                      value={formData.dupeOf}
                      onChange={(e) => setFormData({ ...formData, dupeOf: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Aventus, Sauvage Elixir, Angels' Share, Creación Original..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Casa / Marca del Original
                    </label>
                    <input
                      type="text"
                      value={formData.dupeBrand}
                      onChange={(e) => setFormData({ ...formData, dupeBrand: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Creed, Dior, Kilian..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Concentración
                    </label>
                    <select
                      value={formData.concentration}
                      onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                      className="input-field text-sm bg-white"
                    >
                      <option value="Eau de Parfum">Eau de Parfum (EDP)</option>
                      <option value="Extrait de Parfum">Extrait de Parfum</option>
                      <option value="Eau de Toilette">Eau de Toilette (EDT)</option>
                      <option value="Parfum">Parfum</option>
                      <option value="Eau de Cologne">Eau de Cologne (EDC)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Género
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="input-field text-sm bg-white"
                    >
                      <option value="Unisex">Unisex</option>
                      <option value="Hombre">Hombre (Masculino)</option>
                      <option value="Mujer">Mujer (Femenino)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Familia Olfativa
                    </label>
                    <input
                      type="text"
                      value={formData.olfactoryFamily}
                      onChange={(e) => setFormData({ ...formData, olfactoryFamily: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Ámbar Especiada, Cítrica Amaderada..."
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 3: Pirámide Olfativa */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  🌿 Pirámide Olfativa y Acordes (Separar con comas)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Notas de Salida
                    </label>
                    <input
                      type="text"
                      value={formData.notesTop}
                      onChange={(e) => setFormData({ ...formData, notesTop: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Canela, Nuez moscada, Bergamota"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Notas de Corazón
                    </label>
                    <input
                      type="text"
                      value={formData.notesMiddle}
                      onChange={(e) => setFormData({ ...formData, notesMiddle: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Dátiles, Praliné, Nardo"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Notas de Fondo
                    </label>
                    <input
                      type="text"
                      value={formData.notesBase}
                      onChange={(e) => setFormData({ ...formData, notesBase: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Vainilla, Haba tonka, Madera de akigala"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Acordes Principales
                    </label>
                    <input
                      type="text"
                      value={formData.mainAccords}
                      onChange={(e) => setFormData({ ...formData, mainAccords: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Cálido especiado, Dulce, Vainilla, Amaderado"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Longevidad Estimada
                    </label>
                    <input
                      type="text"
                      value={formData.longevity}
                      onChange={(e) => setFormData({ ...formData, longevity: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: 8 - 12 horas"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mejor Ocasión de Uso
                    </label>
                    <input
                      type="text"
                      value={formData.bestOccasion}
                      onChange={(e) => setFormData({ ...formData, bestOccasion: e.target.value })}
                      className="input-field text-sm bg-white"
                      placeholder="Ej: Noches frías, Citas románticas, Fiestas de gala"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 4: Argumento de Venta y Descripción */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    💡 Argumento de Venta Rápido (Guion para el Asesor)
                  </label>
                  <input
                    type="text"
                    value={formData.salesPitch}
                    onChange={(e) => setFormData({ ...formData, salesPitch: e.target.value })}
                    className="input-field text-sm bg-amber-50/50 border-amber-200"
                    placeholder="Ej: Si buscas la vibra licorosa de Angels' Share a un tercio de precio, este es el perfume perfecto."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Descripción Comercial para la Tienda
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field text-sm"
                    rows={2}
                    placeholder="Descripción detallada del perfume..."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Activo (visible en la tienda y catálogo)</span>
                  </label>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 text-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingPerfume ? 'Guardar Cambios' : 'Guardar Perfume en Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Investigación de Catálogo por Lote con IA */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    Investigación Automática con IA (Gemini Free Tier)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Costo $0 - Enriquecimiento inteligente de notas, acordes y equivalencias.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Selecciona la Modalidad de Investigación:
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      batchMode === 'inventory'
                        ? 'border-purple-600 bg-purple-50/60'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="batchMode"
                      value="inventory"
                      checked={batchMode === 'inventory'}
                      onChange={() => setBatchMode('inventory')}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900">
                        Modalidad 1: Perfumes en Inventario Físico (Recomendado)
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Prioriza investigar los perfumes con stock real en Bodega Ecuador, USA o Tienda Local para que los asesores tengan las notas listas para vender ya.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      batchMode === 'catalog'
                        ? 'border-purple-600 bg-purple-50/60'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="batchMode"
                      value="catalog"
                      checked={batchMode === 'catalog'}
                      onChange={() => setBatchMode('catalog')}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-bold text-gray-900">
                        Modalidad 2: Catálogo Completo (Bajo Pedido)
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Investiga perfumes pendientes de la lista general del catálogo digital (873 fragancias).
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Cantidad de perfumes a procesar en esta tanda:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBatchLimit(num)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                        batchLimit === num
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {num} perfumes
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  * El Free Tier de Gemini procesa con pausa de 3.5s entre consultas para garantizar 0 costo y evitar límites de cuota (15 RPM).
                </p>
              </div>

              {batchResults.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1.5">
                  <div className="text-xs font-bold text-gray-700 mb-1">Resultados de la última tanda:</div>
                  {batchResults.map((r, i) => (
                    <div key={i} className="text-xs text-gray-800 bg-white p-1.5 rounded border border-gray-100 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={batchRunning}
                  className="btn-secondary text-xs sm:text-sm"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleRunBatchAi}
                  disabled={batchRunning}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs sm:text-sm shadow flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className={`h-4 w-4 text-yellow-300 ${batchRunning ? 'animate-spin' : ''}`} />
                  <span>{batchRunning ? 'Investigando perfumes...' : 'Comenzar Investigación'}</span>
                </button>
              </div>
            </div>
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

              {/* Sección de IA y Dupe */}
              {((viewingPerfume as any).dupeOf || (viewingPerfume as any).notes || (viewingPerfume as any).aiEnriched) ? (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-600" /> Información Enriquecida con IA
                    </span>
                    {(viewingPerfume as any).dupeOf && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm flex items-center gap-1">
                        ✨ Dupe de: {(viewingPerfume as any).dupeOf}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {(viewingPerfume as any).olfactoryFamily && (
                      <div className="bg-white p-2 rounded border border-purple-100">
                        <span className="text-gray-500 block">Familia:</span>
                        <span className="font-semibold text-gray-800">{(viewingPerfume as any).olfactoryFamily}</span>
                      </div>
                    )}
                    {(viewingPerfume as any).gender && (
                      <div className="bg-white p-2 rounded border border-purple-100">
                        <span className="text-gray-500 block">Género:</span>
                        <span className="font-semibold text-gray-800">{(viewingPerfume as any).gender}</span>
                      </div>
                    )}
                    {(viewingPerfume as any).concentration && (
                      <div className="bg-white p-2 rounded border border-purple-100">
                        <span className="text-gray-500 block">Concentración:</span>
                        <span className="font-semibold text-gray-800">{(viewingPerfume as any).concentration}</span>
                      </div>
                    )}
                  </div>

                  {(viewingPerfume as any).notes && (
                    <div className="bg-white p-3 rounded border border-purple-100 text-xs space-y-1.5">
                      <span className="font-bold text-gray-700 block">🌿 Pirámide Olfativa:</span>
                      {(viewingPerfume as any).notes.top?.length > 0 && (
                        <p><strong className="text-purple-700">Salida:</strong> {(viewingPerfume as any).notes.top.join(', ')}</p>
                      )}
                      {(viewingPerfume as any).notes.middle?.length > 0 && (
                        <p><strong className="text-purple-700">Corazón:</strong> {(viewingPerfume as any).notes.middle.join(', ')}</p>
                      )}
                      {(viewingPerfume as any).notes.base?.length > 0 && (
                        <p><strong className="text-purple-700">Fondo:</strong> {(viewingPerfume as any).notes.base.join(', ')}</p>
                      )}
                    </div>
                  )}

                  {(viewingPerfume as any).mainAccords?.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-gray-600 block mb-1">Acordes principales:</span>
                      <div className="flex flex-wrap gap-1">
                        {(viewingPerfume as any).mainAccords.map((accord: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-purple-100 text-purple-800 font-medium">
                            {accord}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(viewingPerfume as any).salesPitch && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-xs text-amber-900">
                      <strong>💡 Argumento de venta:</strong> {(viewingPerfume as any).salesPitch}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-2">Este perfume aún no tiene notas ni dupe enriquecidos con IA.</p>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleEnrichPerfume(viewingPerfume);
                      const updated = await perfumeService.getById(viewingPerfume.id);
                      if (updated) setViewingPerfume(updated);
                    }}
                    disabled={enrichingId === viewingPerfume.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-xs font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                    {enrichingId === viewingPerfume.id ? 'Buscando con IA...' : '✨ Buscar Dupe y Notas con IA'}
                  </button>
                </div>
              )}

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

      {/* Modal de Pedidos de Clientes (Demanda no cubierta / Dupes solicitados) */}
      {showRequestedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="h-6 w-6 text-amber-600" />
                  Perfumes Solicitados por Clientes
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Demandas anotadas por asesores en mostrador cuando un cliente buscó una fragancia que no estaba en stock
                </p>
              </div>
              <button
                onClick={() => setShowRequestedModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="py-4">
              {loadingRequested ? (
                <div className="py-12 text-center text-gray-500">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-amber-600" />
                  Cargando solicitudes...
                </div>
              ) : requestedItems.length === 0 ? (
                <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700">No hay pedidos pendientes de clientes</p>
                  <p className="text-xs text-gray-400 mt-1">Cuando los asesores anoten perfumes desde el catálogo de ventas, aparecerán aquí</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {requestedItems.length} {requestedItems.length === 1 ? 'Solicitud registrada' : 'Solicitudes registradas'}
                  </div>
                  {requestedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        item.status === 'IMPORTADO'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : item.status === 'DESCARTADO'
                          ? 'bg-gray-50 border-gray-200 opacity-60'
                          : 'bg-white border-amber-200 shadow-sm hover:shadow'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-base">{item.perfumeName}</span>
                            {item.brand && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                                {item.brand}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                item.status === 'IMPORTADO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'DESCARTADO'
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status || 'PENDIENTE_PEDIDO'}
                            </span>
                          </div>

                          {item.referenceName && (
                            <p className="text-xs text-indigo-700 font-medium mt-1">
                              🎯 Dupe solicitado de: <span className="font-bold">{item.referenceName}</span> {item.referenceBrand ? `(${item.referenceBrand})` : ''}
                            </p>
                          )}

                          {item.notes && (
                            <p className="text-xs text-gray-600 mt-1 italic">
                              "{item.notes}"
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2">
                            <span>👤 {item.advisorName || 'Asesor'}</span>
                            {item.customerPhone && <span>📞 {item.customerPhone}</span>}
                            <span>📅 {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {item.status !== 'IMPORTADO' && (
                            <button
                              onClick={() => handleUpdateRequestedStatus(item.id, 'IMPORTADO')}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                              title="Marcar como pedido / importado"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Ya pedido</span>
                            </button>
                          )}
                          {item.status !== 'DESCARTADO' && (
                            <button
                              onClick={() => handleUpdateRequestedStatus(item.id, 'DESCARTADO')}
                              className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-all"
                              title="Descartar solicitud"
                            >
                              Descartar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowRequestedModal(false)}
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

