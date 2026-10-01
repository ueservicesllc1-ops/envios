import React, { useState, useEffect } from 'react';
import { X, Upload, Scan, Sparkles, Image as ImageIcon, Search, Check, RefreshCw, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Product } from '../types';
import { productService } from '../services/productService';
import { productImageSearchService, ProductImageResult, SuggestedProductInfo } from '../services/productImageSearchService';
import { storage as defaultStorage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SimpleBarcodeScanner from './SimpleBarcodeScanner';
import toast from 'react-hot-toast';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => Promise<any>;
  editingProduct?: Product | null;
  storage?: any;
  initialSku?: string;
  initialName?: string;
  title?: string;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct = null,
  storage = defaultStorage,
  initialSku = '',
  initialName = '',
  title
}) => {
  const [weightUnit, setWeightUnit] = useState<'grams' | 'kilos' | 'pounds'>('pounds');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [, setSkuSearching] = useState(false);
  const [showExistingProductModal, setShowExistingProductModal] = useState(false);
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);

  // Estados para búsqueda de imágenes con IA / Web
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [searchResults, setSearchResults] = useState<ProductImageResult[]>([]);
  const [showImageSearchPanel, setShowImageSearchPanel] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [suggestedInfo, setSuggestedInfo] = useState<SuggestedProductInfo | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    size: '',
    color: '',
    color2: '',
    weight: 0,
    sku: '',
    cost: 0,
    salePrice1: 0,
    salePrice2: 0,
    originalPrice: 0,
    imageUrl: '',
    brand: '',
    perfumeName: '',
    images: [] as string[],
    origin: 'local' as 'local' | 'fivebelow' | 'walgreens'
  });

  const convertToGrams = (weight: number, unit: 'grams' | 'kilos' | 'pounds'): number => {
    if (!weight || weight <= 0) return 0;
    switch (unit) {
      case 'pounds': return weight * 453.592;
      case 'kilos': return weight * 1000;
      default: return weight;
    }
  };

  const convertFromGrams = (weightInGrams: number, unit: 'grams' | 'kilos' | 'pounds'): number => {
    if (!weightInGrams || weightInGrams <= 0) return 0;
    switch (unit) {
      case 'pounds': return weightInGrams / 453.592;
      case 'kilos': return weightInGrams / 1000;
      default: return weightInGrams;
    }
  };

  useEffect(() => {
    if (editingProduct) {
      setWeightUnit('grams');
      setFormData({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        category: editingProduct.category || '',
        size: editingProduct.size || '',
        color: editingProduct.color || '',
        color2: editingProduct.color2 || '',
        weight: editingProduct.weight || 0,
        sku: editingProduct.sku || '',
        cost: editingProduct.cost || 0,
        salePrice1: editingProduct.salePrice1 || 0,
        salePrice2: editingProduct.salePrice2 || 0,
        originalPrice: editingProduct.originalPrice || 0,
        imageUrl: editingProduct.imageUrl || '',
        brand: editingProduct.brand || '',
        perfumeName: editingProduct.perfumeName || '',
        images: editingProduct.images || [],
        origin: editingProduct.origin || 'local'
      });
      setSearchResults([]);
      setShowImageSearchPanel(false);
      setSuggestedInfo(null);
    } else {
      setWeightUnit('pounds');
      setFormData({
        name: initialName || '',
        description: '',
        category: '',
        size: '',
        color: '',
        color2: '',
        weight: 0,
        sku: initialSku || '',
        cost: 0,
        salePrice1: 0,
        salePrice2: 0,
        originalPrice: 0,
        imageUrl: '',
        brand: '',
        perfumeName: '',
        images: [],
        origin: 'local'
      });
      setSearchResults([]);
      setShowImageSearchPanel(false);
      setSuggestedInfo(null);

      // Si viene con un SKU inicial (ej: escaneado que no existía), buscar fotos e información automáticamente
      if (initialSku) {
        handleTriggerImageSearch('', initialSku);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProduct, isOpen, initialSku, initialName]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const loadingToast = toast.loading('Subiendo imagen...');
      const imageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
      toast.dismiss(loadingToast);
      toast.success('Imagen subida correctamente');
    } catch (error) {
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAdditionalImageUpload = async (file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const loadingToast = toast.loading('Subiendo imagen adicional...');
      const imageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), downloadURL] }));
      toast.dismiss(loadingToast);
      toast.success('Imagen adicional subida');
    } catch (error) {
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const existing = await productService.getBySku(barcode);
      if (existing) {
        setExistingProduct(existing);
        setShowExistingProductModal(true);
        return;
      }
      setFormData(prev => ({ ...prev, sku: barcode }));
      toast.success(`SKU escaneado: ${barcode}`);
      setShowScanner(false);

      // Buscar fotos e info automáticamente para el nuevo SKU
      handleTriggerImageSearch(formData.name, barcode);
    } catch (error) {
      toast.error('Error al verificar el código escaneado');
    }
  };

  const handleSkuSearch = async (sku: string) => {
    if (!sku.trim()) return;
    setSkuSearching(true);
    try {
      const existing = await productService.getBySku(sku);
      if (existing) {
        setExistingProduct(existing);
        setShowExistingProductModal(true);
      } else {
        toast.success('SKU disponible');
      }
    } catch (error) {
      toast.error('Error al verificar el SKU');
    } finally {
      setSkuSearching(false);
    }
  };

  // Función para buscar fotos con IA / Web
  const handleTriggerImageSearch = async (queryParam?: string, barcodeParam?: string) => {
    const q = queryParam !== undefined ? queryParam : (customSearchQuery || formData.name);
    const code = barcodeParam !== undefined ? barcodeParam : formData.sku;

    if (!q.trim() && !code.trim()) {
      toast.error('Ingresa el nombre del producto o el código de barras para buscar fotos');
      return;
    }

    setIsSearchingImages(true);
    setShowImageSearchPanel(true);
    const searchToast = toast.loading('Buscando fotos con IA y en internet...');

    try {
      const result = await productImageSearchService.searchImages(q, code);
      toast.dismiss(searchToast);

      if (result.images.length === 0) {
        toast('No se encontraron fotos automáticas. Puedes ingresar un término más específico o subir una imagen.', {
          icon: '🔍'
        });
      } else {
        setSearchResults(result.images);
        toast.success(`¡Encontradas ${result.images.length} opciones de fotos!`);
      }

      if (result.productInfo) {
        setSuggestedInfo(result.productInfo);
      }
    } catch (err) {
      toast.dismiss(searchToast);
      toast.error('Error al buscar fotos en internet');
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Aplicar sugerencia detectada por código de barras
  const handleApplySuggestedInfo = () => {
    if (!suggestedInfo) return;
    setFormData(prev => ({
      ...prev,
      name: prev.name || suggestedInfo.name || '',
      brand: prev.brand || suggestedInfo.brand || '',
      category: prev.category || suggestedInfo.category || prev.category,
      description: prev.description || suggestedInfo.description || ''
    }));
    toast.success('Datos autocompletados desde el catálogo');
  };

  // Seleccionar imagen como principal
  const handleSelectImage = (url: string) => {
    setFormData(prev => ({ ...prev, imageUrl: url }));
    toast.success('Foto seleccionada como imagen principal');
  };

  // Agregar imagen a la lista de imágenes adicionales
  const handleAddAsAdditionalImage = (url: string) => {
    if (formData.images?.includes(url)) {
      toast('Esta imagen ya está en las fotos adicionales', { icon: 'ℹ️' });
      return;
    }
    setFormData(prev => ({ ...prev, images: [...(prev.images || []), url] }));
    toast.success('Foto añadida a imágenes adicionales');
  };

  const handleRemoveAdditionalImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre del producto es obligatorio');
      return;
    }
    if (!formData.sku.trim()) {
      toast.error('El SKU / Código de barras es obligatorio');
      return;
    }

    try {
      setIsSaving(true);
      const dataToSave = {
        ...formData,
        weight: convertToGrams(formData.weight, weightUnit)
      };
      await onSave(dataToSave);
    } catch (err) {
      console.error('Error saving product in modal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-gray-100">
        
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {title || (editingProduct ? 'Editar Producto' : 'Nuevo Producto')}
              </h3>
              <p className="text-xs text-gray-500">
                {editingProduct ? 'Actualiza los datos del producto en el catálogo' : 'Registra un nuevo producto con soporte de IA para imágenes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Notificación de datos sugeridos por IA/código de barras */}
        {suggestedInfo && (suggestedInfo.name || suggestedInfo.brand) && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
            <div className="text-sm text-blue-900">
              <span className="font-semibold">✨ Datos encontrados en la web: </span>
              {suggestedInfo.name && <span>{suggestedInfo.name} </span>}
              {suggestedInfo.brand && <span className="text-blue-700 font-medium">({suggestedInfo.brand})</span>}
            </div>
            <button
              type="button"
              onClick={handleApplySuggestedInfo}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-all whitespace-nowrap"
            >
              Autocompletar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Nombre del Producto */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Nombre del Producto *
                </label>
                {formData.name.trim() && (
                  <button
                    type="button"
                    onClick={() => handleTriggerImageSearch(formData.name, formData.sku)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Buscar fotos para este nombre
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="Ej: Galletas Oreo 432g, Perfume Sauvage Dior, etc."
              />
            </div>

            {/* SKU / Código de barras */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                SKU (Código de Barras) *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  onBlur={(e) => handleSkuSearch(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Código numérico o alfanumérico"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="btn-secondary px-3 flex items-center gap-1 text-gray-700"
                  title="Escanear con cámara"
                >
                  <Scan className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Categoría *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                <option value="">Seleccionar categoría</option>
                <option value="Comestibles">Comestibles / Snacks</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Electrónicos">Electrónicos</option>
                <option value="Ropa">Ropa</option>
                <option value="ZAPATOS">ZAPATOS</option>
                <option value="Hogar">Hogar</option>
                <option value="Deportes">Deportes</option>
                <option value="Perfumes">Perfumes</option>
                <option value="VITAMINAS">VITAMINAS</option>
                <option value="Cuidado Personal">Cuidado Personal</option>
                <option value="Soy Burro">Soy Burro</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            {/* Peso */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Peso</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  className="input-field flex-1"
                  placeholder="0.00"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => {
                    const newUnit = e.target.value as any;
                    if (formData.weight > 0) {
                      const g = weightUnit === 'grams' ? formData.weight : convertToGrams(formData.weight, weightUnit);
                      setFormData({ ...formData, weight: convertFromGrams(g, newUnit) });
                    }
                    setWeightUnit(newUnit);
                  }}
                  className="input-field w-32 font-medium"
                >
                  <option value="pounds">Libras</option>
                  <option value="grams">Gramos</option>
                  <option value="kilos">Kilos</option>
                </select>
              </div>
            </div>

            {/* Costo */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Costo ($) *</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                className="input-field font-medium text-gray-900"
                placeholder="0.00"
              />
            </div>

            {/* Precio Venta 1 */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Precio Venta 1 ($) *</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.salePrice1 || ''}
                onChange={(e) => setFormData({ ...formData, salePrice1: parseFloat(e.target.value) || 0 })}
                className="input-field font-medium text-gray-900"
                placeholder="0.00"
              />
            </div>

            {/* Precio Tienda / Precio Venta 2 */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Precio Tienda ($) *</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.salePrice2 || ''}
                onChange={(e) => setFormData({ ...formData, salePrice2: parseFloat(e.target.value) || 0 })}
                className="input-field font-medium text-gray-900"
                placeholder="0.00"
              />
            </div>

            {/* Marca (Opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca / Fabricante</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="input-field"
                placeholder="Ej: Nabisco, Nike, Samsung"
              />
            </div>

            {/* Talla / Medida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Talla / Medida</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="input-field"
                placeholder="Ej: M, 42, 500ml, 12oz"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={2}
                placeholder="Detalles adicionales del producto..."
              />
            </div>

            {/* ========================================================== */}
            {/* SECCIÓN DE FOTOS: SUBIR + BÚSQUEDA CON IA / WEB */}
            {/* ========================================================== */}
            <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <label className="block text-sm font-bold text-gray-900">
                    Imagen del Producto
                  </label>
                  <p className="text-xs text-gray-500">
                    Puedes subir una foto propia o usar IA para buscar opciones en internet
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Botón para buscar fotos con IA / Web */}
                  <button
                    type="button"
                    onClick={() => handleTriggerImageSearch()}
                    disabled={isSearchingImages}
                    className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSearchingImages ? (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5 text-yellow-300" />
                    )}
                    Buscar fotos con IA / Web
                  </button>

                  {/* Botón para subir archivo manual */}
                  <label className="btn-secondary text-xs cursor-pointer py-1.5 px-3 flex items-center m-0">
                    <Upload className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    Subir Foto
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Vista previa de la imagen principal seleccionada */}
              <div className="flex items-center gap-4 pt-1">
                {formData.imageUrl ? (
                  <div className="relative group">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="h-24 w-24 object-cover rounded-xl border-2 border-primary-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 opacity-90 group-hover:opacity-100 transition-opacity"
                      title="Quitar foto"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Principal
                    </span>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-white">
                    <ImageIcon className="h-8 w-8 mb-1" />
                    <span className="text-[10px] text-center px-1">Sin foto</span>
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <div className="text-xs font-medium text-gray-700">
                    {formData.imageUrl ? (
                      <span className="text-green-700 font-semibold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Foto lista para guardar
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        Selecciona una foto de los resultados de internet o sube un archivo
                      </span>
                    )}
                  </div>
                  {formData.imageUrl && (
                    <p className="text-[11px] text-gray-400 truncate max-w-md">
                      {formData.imageUrl}
                    </p>
                  )}
                  {/* Entrada directa de URL por si el usuario desea pegar un link */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="url"
                      placeholder="O pega directamente un link de imagen aquí..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="text-xs px-2.5 py-1 border border-gray-300 rounded-md w-full bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Panel de resultados de búsqueda de fotos con IA / Web */}
              {showImageSearchPanel && (
                <div className="mt-3 p-3.5 bg-white rounded-xl border border-indigo-100 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-bold text-gray-800">
                        Opciones de fotos encontradas en internet
                      </span>
                      {searchResults.length > 0 && (
                        <span className="text-[11px] px-2 py-0.5 bg-purple-100 text-purple-700 font-medium rounded-full">
                          {searchResults.length} fotos
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImageSearchPanel(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Ocultar panel
                    </button>
                  </div>

                  {/* Barra de refinamiento de búsqueda */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar con otras palabras (ej: Coca Cola lata 355ml)..."
                        value={customSearchQuery}
                        onChange={(e) => setCustomSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleTriggerImageSearch(customSearchQuery, formData.sku);
                          }
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerImageSearch(customSearchQuery, formData.sku)}
                      disabled={isSearchingImages}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {isSearchingImages ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {/* Estado de carga */}
                  {isSearchingImages && (
                    <div className="py-6 flex flex-col items-center justify-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                      <p className="text-xs font-medium text-purple-700 animate-pulse">
                        Buscando fotos en la web e identificando el producto...
                      </p>
                    </div>
                  )}

                  {/* Galería de opciones de fotos */}
                  {!isSearchingImages && searchResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-56 overflow-y-auto p-1">
                      {searchResults.map((item, idx) => {
                        const isSelected = formData.imageUrl === item.url;
                        return (
                          <div
                            key={idx}
                            className={`group relative rounded-lg border-2 p-1 bg-white cursor-pointer transition-all hover:shadow-md ${
                              isSelected
                                ? 'border-green-500 ring-2 ring-green-200'
                                : 'border-gray-200 hover:border-purple-300'
                            }`}
                            onClick={() => handleSelectImage(item.url)}
                          >
                            <div className="aspect-square rounded overflow-hidden bg-gray-100 mb-1 relative">
                              <img
                                src={item.thumb || item.url}
                                alt={item.title || 'Opción'}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                onError={(e) => {
                                  // Ocultar si la imagen no carga
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-green-600 text-white rounded-full p-0.5 shadow">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-600 truncate font-medium">
                              {item.title || 'Foto de internet'}
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-gray-400 mt-0.5">
                              <span className="truncate">{item.source}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddAsAdditionalImage(item.url);
                                }}
                                className="text-purple-600 hover:text-purple-800 font-semibold p-0.5"
                                title="Añadir como foto adicional"
                              >
                                + Extra
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isSearchingImages && searchResults.length === 0 && (
                    <div className="py-4 text-center text-xs text-gray-500">
                      No hay fotos para mostrar con este término. Escribe el nombre del producto arriba y haz clic en "Buscar".
                    </div>
                  )}
                </div>
              )}

              {/* Fotos adicionales */}
              {formData.images && formData.images.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Fotos Adicionales ({formData.images.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((img, i) => (
                      <div key={i} className="relative group w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <img src={img} alt={`Extra ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalImage(i)}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-90 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-14 h-14 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 cursor-pointer bg-white">
                      <Plus className="h-4 w-4" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files && handleAdditionalImageUpload(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploadingImage || isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {editingProduct ? 'Actualizar Producto' : 'Guardar y Registrar Producto'}
            </button>
          </div>
        </form>

        {/* Lector de código de barras */}
        {showScanner && (
          <SimpleBarcodeScanner
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onScan={handleBarcodeScan}
            title="Escanear Código de Barras"
          />
        )}

        {/* Modal de Producto Existente */}
        {showExistingProductModal && existingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Producto Existente</h3>
                <button
                  onClick={() => { setShowExistingProductModal(false); setExistingProduct(null); }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    Ya existe un producto con el SKU: <strong className="font-mono">{existingProduct.sku}</strong>
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
                  <p><strong>Nombre:</strong> {existingProduct.name}</p>
                  <p><strong>Categoría:</strong> {existingProduct.category}</p>
                  <p><strong>Precio:</strong> ${existingProduct.salePrice1?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setShowExistingProductModal(false);
                      setExistingProduct(null);
                      setFormData(prev => ({ ...prev, sku: '' }));
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cambiar SKU
                  </button>
                  <button
                    onClick={() => {
                      setShowExistingProductModal(false);
                      setExistingProduct(null);
                      onSave({ ...existingProduct });
                    }}
                    className="btn-primary text-sm"
                  >
                    Usar Existente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductFormModal;
