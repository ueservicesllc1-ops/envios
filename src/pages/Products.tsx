import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Filter, Package, X, Database, Upload, Image, Scan, Layers, CheckSquare, Square, Download } from 'lucide-react';
import { Product } from '../types';
import { productService } from '../services/productService';
import { addSampleProducts } from '../utils/addSampleProducts';
import { importFiveBelowProducts } from '../utils/importFiveBelow';
import { importWalgreensProducts } from '../utils/importWalgreens';
import { updateWalgreensImages } from '../utils/updateWalgreensImages';
import { cleanProductsWithoutImages } from '../utils/cleanProductsWithoutImages';
import { fixFiveBelowImages } from '../utils/fixFiveBelowImages';
import { deleteProductsWithBrokenImages } from '../utils/deleteProductsWithBrokenImages';
import { cleanAllFiveBelowProducts } from '../utils/cleanAllFiveBelowProducts';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SimpleBarcodeScanner from '../components/SimpleBarcodeScanner';
import toast from 'react-hot-toast';
import { calculateCostPlusShipping, calculateShippingCost } from '../utils/shippingCost';
import { formatCurrency } from '../utils/formatters';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [showExistingProductModal, setShowExistingProductModal] = useState(false);
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const [skuSearching, setSkuSearching] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showConsolidateSection, setShowConsolidateSection] = useState(false);
  const [selectedProductsForConsolidation, setSelectedProductsForConsolidation] = useState<Set<string>>(new Set());
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'grams' | 'kilos' | 'pounds'>('pounds');

  // Estados para filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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
    // Campos específicos para perfumes
    brand: '',
    perfumeName: '',
    images: [] as string[],
    origin: 'local' as 'local' | 'fivebelow' | 'walgreens'
  });

  useEffect(() => {
    loadProducts();

    // Ejecutar limpieza automáticamente
    const autoClean = async () => {
      try {
        console.log('Ejecutando limpieza automática de productos...');
        const allProducts = await productService.getAll();
        console.log(`Total productos: ${allProducts.length}`);

        let removed = 0;
        for (const product of allProducts) {
          const hasNoWeight = !product.weight || product.weight === 0;
          const hasNoCost = !product.cost || product.cost === 0;
          const hasNoPrice = !product.salePrice1 || product.salePrice1 === 0;

          // Detectar imágenes rotas de Five Below (sin proxy)
          const imageUrl = product.imageUrl || '';
          const hasBrokenFBImage = imageUrl.includes('fbres.fivebelow.com') && !imageUrl.includes('wsrv.nl');

          if ((hasNoWeight && hasNoCost && hasNoPrice) || hasBrokenFBImage) {
            const reason = hasBrokenFBImage ? 'Imagen FB rota' : `Datos incompletos (Peso: ${product.weight}, Costo: ${product.cost}, Precio: ${product.salePrice1})`;
            console.log(`Eliminando producto: ${product.name || 'Sin nombre'} - Razón: ${reason}`);
            await productService.delete(product.id);
            removed++;
          }
        }

        if (removed > 0) {
          console.log(`✅ Eliminados ${removed} productos inválidos`);
          await loadProducts();
          alert(`Se eliminaron ${removed} productos sin datos válidos o con imágenes rotas`);
        } else {
          console.log('✅ No se encontraron productos inválidos para eliminar');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    // Ejecutar limpieza después de 2 segundos
    setTimeout(autoClean, 2000);

    // Exponer función de limpieza en el objeto window para uso manual
    (window as any).cleanInvalidProducts = async () => {
      try {
        console.log('Ejecutando limpieza manual de productos...');
        const allProducts = await productService.getAll();
        console.log(`Total productos: ${allProducts.length}`);

        let removed = 0;
        for (const product of allProducts) {
          const hasNoWeight = !product.weight || product.weight === 0;
          const hasNoCost = !product.cost || product.cost === 0;
          const hasNoPrice = !product.salePrice1 || product.salePrice1 === 0;

          if (hasNoWeight && hasNoCost && hasNoPrice) {
            console.log(`Eliminando producto: ${product.name || 'Sin nombre'} - Peso: ${product.weight}, Costo: ${product.cost}, Precio: ${product.salePrice1}`);
            await productService.delete(product.id);
            removed++;
          }
        }

        console.log(`✅ Eliminados ${removed} productos inválidos`);
        await loadProducts();
        alert(`Se eliminaron ${removed} productos sin datos válidos`);
      } catch (error) {
        console.error('Error:', error);
      }
    };
  }, []);

  const handleConsolidateProducts = async () => {
    if (selectedProductsForConsolidation.size < 2) {
      toast.error('Debes seleccionar al menos 2 productos para consolidar');
      return;
    }

    try {
      const selectedProducts = products.filter(p => selectedProductsForConsolidation.has(p.id));

      // Obtener el primer producto como base
      const baseProduct = selectedProducts[0];

      // Crear nombre consolidado (usar el nombre base sin variantes)
      const baseName = baseProduct.name.split(' - ')[0].split(' (')[0].trim();

      // Crear el producto consolidado
      const consolidatedProductData: any = {
        name: baseName,
        description: baseProduct.description || `Producto consolidado con ${selectedProducts.length} variantes`,
        category: baseProduct.category,
        sku: `CONSOL-${Date.now()}`,
        cost: Math.min(...selectedProducts.map(p => p.cost || 0)),
        salePrice1: Math.min(...selectedProducts.map(p => p.salePrice1 || 0)),
        salePrice2: Math.min(...selectedProducts.map(p => p.salePrice2 || 0)),
        weight: baseProduct.weight || 0,
        imageUrl: baseProduct.imageUrl,
        isConsolidated: true,
        consolidatedProducts: selectedProducts.map(p => p.id)
      };

      // Solo agregar originalPrice si tiene un valor definido
      if (baseProduct.originalPrice !== undefined && baseProduct.originalPrice !== null) {
        consolidatedProductData.originalPrice = baseProduct.originalPrice;
      }

      const consolidatedProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = consolidatedProductData;

      // Crear el producto consolidado
      const consolidatedId = await productService.create(consolidatedProduct);

      // Actualizar los productos originales para marcar que pertenecen a un consolidado
      for (const product of selectedProducts) {
        await productService.update(product.id, {
          parentConsolidatedId: consolidatedId
        });
      }

      toast.success(`Productos consolidados exitosamente. Se creó el producto: ${baseName}`);

      // Limpiar selección y recargar
      setSelectedProductsForConsolidation(new Set());
      setShowConsolidateModal(false);
      await loadProducts();
    } catch (error) {
      console.error('Error consolidating products:', error);
      toast.error('Error al consolidar productos');
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFiveBelow = async () => {
    if (window.confirm('¿Estás seguro de importar los productos de ejemplo de Five Below? Estos se agregarán a tu inventario.')) {
      setLoading(true);
      await importFiveBelowProducts();
      await loadProducts();
      setLoading(false);
    }
  };

  const handleImportWalgreens = async () => {
    if (window.confirm('¿Estás seguro de importar los productos de ejemplo de Walgreens? Estos se agregarán a tu inventario.')) {
      setLoading(true);
      await importWalgreensProducts();
      await loadProducts();
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...products];

    // Filtro por término de búsqueda (nombre, SKU, descripción)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        (product.description && product.description.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por categoría
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filtro por rango de precio
    filtered = filtered.filter(product => {
      const price = product.salePrice1 || 0;
      return price >= priceRange.min && price <= priceRange.max;
    });

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.salePrice1 || 0;
          bValue = b.salePrice1 || 0;
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, priceRange, sortBy, sortOrder]);

  // Efecto para aplicar filtros cuando cambien los criterios
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productService.delete(id);
        setProducts(products.filter(p => p.id !== id));
        toast.success('Producto eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar producto');
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      toast.loading('Subiendo imagen...');

      // Crear referencia en Firebase Storage
      const imageRef = ref(storage, `products/${Date.now()}_${file.name}`);

      // Subir archivo
      const snapshot = await uploadBytes(imageRef, file);

      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Actualizar formData con la nueva URL
      setFormData({ ...formData, imageUrl: downloadURL });

      toast.success('Imagen subida correctamente');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAdditionalImageUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      toast.loading('Subiendo imagen adicional...');

      const imageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), downloadURL]
      }));

      toast.success('Imagen adicional subida');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, index) => index !== indexToRemove)
    }));
  };


  const handleBarcodeScan = async (barcode: string) => {
    try {
      // Verificar si el SKU ya existe en la base de datos
      const existingProduct = await productService.getBySku(barcode);
      if (existingProduct) {
        setExistingProduct(existingProduct);
        setShowExistingProductModal(true);
        return;
      }

      // Auto-rellenar el campo SKU
      setFormData(prev => ({
        ...prev,
        sku: barcode
      }));

      toast.success(`SKU escaneado: ${barcode}`);
      setShowScanner(false);
    } catch (error) {
      console.error('Error verifying scanned SKU:', error);
      toast.error('Error al verificar el código escaneado');
    }
  };

  const handleSkuSearch = async (sku: string) => {
    if (!sku.trim()) return;

    setSkuSearching(true);

    try {
      // Buscar producto existente directamente en la base de datos
      const existingProduct = await productService.getBySku(sku);

      if (existingProduct) {
        setExistingProduct(existingProduct);
        setShowExistingProductModal(true);
      } else {
        toast.success('SKU disponible - puedes continuar agregando el producto');
      }
    } catch (error) {
      console.error('Error searching SKU:', error);
      toast.error('Error al verificar el SKU');
    } finally {
      setSkuSearching(false);
    }
  };

  // Función para convertir peso a gramos según la unidad seleccionada
  const convertToGrams = (weight: number, unit: 'grams' | 'kilos' | 'pounds'): number => {
    if (!weight || weight <= 0) return 0;

    switch (unit) {
      case 'pounds':
        // 1 libra = 453.592 gramos
        return weight * 453.592;
      case 'kilos':
        // 1 kilo = 1000 gramos
        return weight * 1000;
      case 'grams':
      default:
        return weight;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convertir el peso a gramos antes de guardar
      const weightInGrams = convertToGrams(formData.weight, weightUnit);
      const productData = {
        ...formData,
        weight: weightInGrams
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, productData);
        setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
      } else {
        const id = await productService.create(productData);
        const newProduct: Product = {
          id,
          ...productData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setProducts([newProduct, ...products]);
      }

      setShowModal(false);
      setEditingProduct(null);
      setWeightUnit('pounds');
      setFormData({
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
        images: [],
        origin: 'local'
      });
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  // Función para convertir de gramos a otra unidad
  const convertFromGrams = (weightInGrams: number, unit: 'grams' | 'kilos' | 'pounds'): number => {
    if (!weightInGrams || weightInGrams <= 0) return 0;

    switch (unit) {
      case 'pounds':
        // 1 libra = 453.592 gramos
        return weightInGrams / 453.592;
      case 'kilos':
        // 1 kilo = 1000 gramos
        return weightInGrams / 1000;
      case 'grams':
      default:
        return weightInGrams;
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // El peso se guarda en gramos, así que mostramos en gramos por defecto
    setWeightUnit('grams');
    const weightInGrams = product.weight || 0;
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      size: product.size || '',
      color: product.color || '',
      color2: product.color2 || '',
      weight: weightInGrams, // Mostrar en gramos por defecto
      sku: product.sku,
      cost: product.cost,
      salePrice1: product.salePrice1,
      salePrice2: product.salePrice2,
      originalPrice: product.originalPrice || 0,
      imageUrl: product.imageUrl || '',
      brand: product.brand || '',
      perfumeName: product.perfumeName || '',
      images: product.images || [],
      origin: product.origin || 'local'
    });
    setShowModal(true);
  };

  const handleView = (product: Product) => {
    setViewingProduct(product);
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 px-2 sm:px-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestiona tu catálogo de productos</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:space-x-3">
          <button
            onClick={() => setShowConsolidateSection(!showConsolidateSection)}
            className="btn-secondary flex items-center text-sm sm:text-base"
          >
            <Layers className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Consolidar</span>
            <span className="sm:hidden">Cons.</span>
          </button>

          <button
            onClick={handleImportFiveBelow}
            className="btn-secondary flex items-center bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-sm sm:text-base"
            title="Importar demo Five Below"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Importar FB</span>
            <span className="sm:hidden">FB</span>
          </button>

          <button
            onClick={handleImportWalgreens}
            className="btn-secondary flex items-center bg-red-50 text-red-700 border-red-200 hover:bg-red-100 text-sm sm:text-base"
            title="Importar demo Walgreens"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Importar WG</span>
            <span className="sm:hidden">WG</span>
          </button>

          <button
            onClick={async () => {
              setLoading(true);
              await updateWalgreensImages();
              await loadProducts();
              setLoading(false);
            }}
            className="btn-secondary flex items-center bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 text-sm sm:text-base"
            title="Actualizar imágenes de Walgreens"
          >
            <Image className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Fix WG Imgs</span>
            <span className="sm:hidden">🔧</span>
          </button>

          <button
            onClick={async () => {
              setLoading(true);
              await fixFiveBelowImages();
              await loadProducts();
              setLoading(false);
            }}
            className="btn-secondary flex items-center bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-sm sm:text-base"
            title="Actualizar imágenes de Five Below"
          >
            <Image className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Fix FB Imgs</span>
            <span className="sm:hidden">🔧</span>
          </button>

          <button
            onClick={async () => {
              if (window.confirm('¿Eliminar TODOS los productos de Five Below? Esto eliminará todos los productos FB independientemente de sus imágenes.')) {
                setLoading(true);
                await cleanAllFiveBelowProducts();
                await loadProducts();
                setLoading(false);
              }
            }}
            className="btn-secondary flex items-center bg-red-50 text-red-700 border-red-200 hover:bg-red-100 text-sm sm:text-base"
            title="Eliminar todos los productos de Five Below"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Eliminar Todos FB</span>
            <span className="sm:hidden">🗑️FB</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nuevo Producto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>

          {products.length === 0 && (
            <button
              onClick={async () => {
                const sampleProducts = [
                  {
                    name: 'Laptop HP Pavilion',
                    description: 'Laptop HP Pavilion 15 pulgadas, 8GB RAM, 256GB SSD',
                    category: 'Electrónicos',
                    sku: 'HP-PAV-001',
                    cost: 450.00,
                    salePrice1: 550.00,
                    salePrice2: 500.00,
                    barcode: '1234567890123'
                  },
                  {
                    name: 'Mouse Inalámbrico',
                    description: 'Mouse inalámbrico Logitech M705',
                    category: 'Accesorios',
                    sku: 'LOG-M705-001',
                    cost: 25.00,
                    salePrice1: 35.00,
                    salePrice2: 30.00,
                    barcode: '1234567890124'
                  },
                  {
                    name: 'Teclado Mecánico',
                    description: 'Teclado mecánico RGB con switches azules',
                    category: 'Accesorios',
                    sku: 'TEC-RGB-001',
                    cost: 80.00,
                    salePrice1: 120.00,
                    salePrice2: 100.00,
                    barcode: '1234567890125'
                  }
                ];

                try {
                  toast.loading('Agregando productos de ejemplo...');
                  for (const product of sampleProducts) {
                    await productService.create(product);
                  }
                  await loadProducts();
                  toast.success('Productos de ejemplo agregados');
                } catch (error) {
                  toast.error('Error al agregar productos');
                }
              }}
              className="btn-secondary flex items-center"
            >
              <Database className="h-4 w-4 mr-2" />
              Agregar Ejemplos
            </button>
          )}
        </div>
      </div>

      {/* Sección de Consolidación */}
      {showConsolidateSection && (
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Consolidar Productos</h2>
              <p className="text-sm text-gray-600">Selecciona productos similares para agruparlos en uno solo</p>
            </div>
            <button
              onClick={() => {
                setShowConsolidateSection(false);
                setSelectedProductsForConsolidation(new Set());
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {selectedProductsForConsolidation.size > 0 && (
            <div className="mb-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {selectedProductsForConsolidation.size} producto(s) seleccionado(s)
              </p>
              <button
                onClick={() => setShowConsolidateModal(true)}
                className="mt-2 btn-primary text-sm"
              >
                Consolidar Productos Seleccionados
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-3 sm:gap-0">
            {/* Filtro por categoría */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Todas las categorías</option>
              <option value="Electrónicos">Electrónicos</option>
              <option value="Ropa">Ropa</option>
              <option value="Hogar">Hogar</option>
              <option value="Deportes">Deportes</option>
              <option value="Libros">Libros</option>
              <option value="Perfumes">Perfumes</option>
              <option value="ZAPATOS">ZAPATOS</option>
              <option value="VITAMINAS">VITAMINAS</option>
              <option value="Soy Burro">Soy Burro</option>
              <option value="Otros">Otros</option>
            </select>

            {/* Filtro por precio */}
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                className="input-field w-16 sm:w-20 text-sm"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                className="input-field w-16 sm:w-20 text-sm"
              />
            </div>

            {/* Ordenamiento */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'name' | 'price' | 'category');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="input-field text-sm"
            >
              <option value="name-asc">Nombre A-Z</option>
              <option value="name-desc">Nombre Z-A</option>
              <option value="price-asc">Precio Menor</option>
              <option value="price-desc">Precio Mayor</option>
              <option value="category-asc">Categoría A-Z</option>
              <option value="category-desc">Categoría Z-A</option>
            </select>

            <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
              {filteredProducts.length} encontrados
            </span>

            {/* Botón para limpiar filtros */}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                setPriceRange({ min: 0, max: 1000 });
                setSortBy('name');
                setSortOrder('asc');
              }}
              className="btn-secondary flex items-center text-sm"
            >
              <X className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table - Desktop */}
      <div className="card hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {showConsolidateSection && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <button
                      onClick={() => {
                        const nonConsolidated = filteredProducts.filter(p => !p.isConsolidated && !p.parentConsolidatedId);
                        if (selectedProductsForConsolidation.size === nonConsolidated.length && nonConsolidated.length > 0) {
                          setSelectedProductsForConsolidation(new Set());
                        } else {
                          setSelectedProductsForConsolidation(new Set(nonConsolidated.map(p => p.id)));
                        }
                      }}
                      className="flex items-center justify-center"
                    >
                      {(() => {
                        const nonConsolidated = filteredProducts.filter(p => !p.isConsolidated && !p.parentConsolidatedId);
                        return selectedProductsForConsolidation.size === nonConsolidated.length && nonConsolidated.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        );
                      })()}
                    </button>
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo + Envío</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio 1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Tienda</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const productCost =
                  typeof product.cost === 'number' && !Number.isNaN(product.cost)
                    ? product.cost
                    : 0;
                const shippingCost = calculateShippingCost(product.weight);
                const costPlusShipping = calculateCostPlusShipping(
                  product.cost,
                  product.weight
                );

                const isSelected = selectedProductsForConsolidation.has(product.id);
                const isConsolidated = product.isConsolidated || product.parentConsolidatedId;

                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${isConsolidated ? 'opacity-60' : ''}`}>
                    {showConsolidateSection && (
                      <td className="px-6 py-4">
                        {!isConsolidated && (
                          <button
                            onClick={() => {
                              const newSelected = new Set(selectedProductsForConsolidation);
                              if (isSelected) {
                                newSelected.delete(product.id);
                              } else {
                                newSelected.add(product.id);
                              }
                              setSelectedProductsForConsolidation(newSelected);
                            }}
                            className="flex items-center justify-center"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              src={product.imageUrl}
                              alt={product.name}
                              onClick={() => handleImageClick(product.imageUrl!)}
                              title="Hacer clic para ver imagen grande"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-sm">IMG</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            <div dangerouslySetInnerHTML={{ __html: product.description || '' }} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{product.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                      {(product.size || product.color || product.color2 || product.brand || product.perfumeName) && (
                        <div className="mt-1 text-xs text-gray-500">
                          {product.category === 'Perfumes' ? (
                            <>
                              {product.brand && <span className="mr-2">Marca: {product.brand}</span>}
                              {product.perfumeName && <span>Perfume: {product.perfumeName}</span>}
                            </>
                          ) : (
                            <>
                              {product.size && <span className="mr-2">Talla: {product.size}</span>}
                              {product.color && <span className="mr-2">Color: {product.color}</span>}
                              {product.color2 && <span>Color 2: {product.color2}</span>}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {product.weight ? `${product.weight}g` : 'Sin peso'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(productCost)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(costPlusShipping)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {shippingCost > 0 ? `Incluye envío: ${formatCurrency(shippingCost)}` : 'Sin costo de envío'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(typeof product.salePrice1 === 'number' ? product.salePrice1 : 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(typeof product.salePrice2 === 'number' ? product.salePrice2 : 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleView(product)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredProducts.map((product) => {
          const productCost =
            typeof product.cost === 'number' && !Number.isNaN(product.cost)
              ? product.cost
              : 0;
          const shippingCost = calculateShippingCost(product.weight);
          const costPlusShipping = calculateCostPlusShipping(
            product.cost,
            product.weight
          );

          const isSelected = selectedProductsForConsolidation.has(product.id);
          const isConsolidated = product.isConsolidated || product.parentConsolidatedId;

          return (
            <div
              key={product.id}
              className={`card ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isConsolidated ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start space-x-3">
                {showConsolidateSection && !isConsolidated && (
                  <button
                    onClick={() => {
                      const newSelected = new Set(selectedProductsForConsolidation);
                      if (isSelected) {
                        newSelected.delete(product.id);
                      } else {
                        newSelected.add(product.id);
                      }
                      setSelectedProductsForConsolidation(newSelected);
                    }}
                    className="mt-1"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-primary-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                )}

                <div className="h-16 w-16 flex-shrink-0">
                  {product.imageUrl ? (
                    <img
                      className="h-16 w-16 rounded-lg object-cover cursor-pointer"
                      src={product.imageUrl}
                      alt={product.name}
                      onClick={() => handleImageClick(product.imageUrl!)}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">IMG</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        <div dangerouslySetInnerHTML={{ __html: product.description || '' }} />
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleView(product)}
                        className="p-1 text-gray-400 hover:text-green-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">SKU:</span>
                      <span className="text-gray-900 font-medium">{product.sku}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Categoría:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Peso:</span>
                      <span className="text-gray-900">{product.weight ? `${product.weight}g` : 'Sin peso'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Costo:</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(productCost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Costo + Envío:</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(costPlusShipping)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Precio 1:</span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(typeof product.salePrice1 === 'number' ? product.salePrice1 : 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Precio Tienda:</span>
                      <span className="text-gray-900 font-semibold">{formatCurrency(typeof product.salePrice2 === 'number' ? product.salePrice2 : 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensaje cuando no hay resultados */}
      {filteredProducts.length === 0 && products.length > 0 && (
        <div className="card text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros de búsqueda
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                setPriceRange({ min: 0, max: 1000 });
                setSortBy('name');
                setSortOrder('asc');
              }}
              className="btn-primary"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="card text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron productos con ese criterio.' : 'Comienza agregando tu primer producto.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                  setWeightUnit('grams');
                  setFormData({
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
                    images: [],
                    origin: 'local'
                  });
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Ej: Smartphone Samsung"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      placeholder="Ej: 1234567890123"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="btn-secondary flex items-center px-3"
                      title="Escanear código de barras"
                    >
                      <Scan className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSkuSearch(formData.sku)}
                      disabled={skuSearching || !formData.sku.trim()}
                      className="btn-secondary flex items-center px-3"
                      title="Verificar si el SKU existe"
                    >
                      {skuSearching ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origen del Producto
                  </label>
                  <select
                    value={formData.origin || 'local'}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value as 'local' | 'fivebelow' })}
                    className="input-field"
                  >
                    <option value="local">Inventario Local</option>
                    <option value="fivebelow">Five Below (Bajo Pedido)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría * (Actualizado)
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Electrónicos">Electrónicos</option>
                    <option value="Ropa">Ropa</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Deportes">Deportes</option>
                    <option value="Libros">Libros</option>
                    <option value="Perfumes">Perfumes</option>
                    <option value="ZAPATOS">ZAPATOS</option>
                    <option value="VITAMINAS">VITAMINAS</option>
                    <option value="Soy Burro">Soy Burro</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                {/* Campos dinámicos según la categoría */}
                {formData.category === 'Perfumes' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marca *
                      </label>
                      <select
                        required
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="input-field"
                      >
                        <option value="">Seleccionar marca</option>
                        <option value="Lattafa">Lattafa</option>
                        <option value="Chanel">Chanel</option>
                        <option value="Dior">Dior</option>
                        <option value="Versace">Versace</option>
                        <option value="Armani">Armani</option>
                        <option value="Gucci">Gucci</option>
                        <option value="Prada">Prada</option>
                        <option value="Hugo Boss">Hugo Boss</option>
                        <option value="Calvin Klein">Calvin Klein</option>
                        <option value="Tommy Hilfiger">Tommy Hilfiger</option>
                        <option value="Lacoste">Lacoste</option>
                        <option value="Polo Ralph Lauren">Polo Ralph Lauren</option>
                        <option value="Burberry">Burberry</option>
                        <option value="Yves Saint Laurent">Yves Saint Laurent</option>
                        <option value="Dolce & Gabbana">Dolce & Gabbana</option>
                        <option value="Otra">Otra</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Perfume *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.perfumeName}
                        onChange={(e) => setFormData({ ...formData, perfumeName: e.target.value })}
                        className="input-field"
                        placeholder="Ej: Eau de Toilette"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Talla
                      </label>
                      <select
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        className="input-field"
                      >
                        <option value="">Seleccionar talla</option>
                        <option value="XXS">XXS</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="3XL">3XL</option>
                        <option value="36">36</option>
                        <option value="37">37</option>
                        <option value="38">38</option>
                        <option value="39">39</option>
                        <option value="40">40</option>
                        <option value="41">41</option>
                        <option value="42">42</option>
                        <option value="43">43</option>
                        <option value="44">44</option>
                        <option value="45">45</option>
                        <option value="4">4</option>
                        <option value="4.5">4.5</option>
                        <option value="5">5</option>
                        <option value="5.5">5.5</option>
                        <option value="6">6</option>
                        <option value="6.5">6.5</option>
                        <option value="7">7</option>
                        <option value="7.5">7.5</option>
                        <option value="8">8</option>
                        <option value="8.5">8.5</option>
                        <option value="9">9</option>
                        <option value="9.5">9.5</option>
                        <option value="10">10</option>
                        <option value="10.5">10.5</option>
                        <option value="11">11</option>
                        <option value="11.5">11.5</option>
                        <option value="12">12</option>
                        <option value="Sin talla">Sin talla</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color 1
                      </label>
                      <select
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="input-field"
                      >
                        <option value="">Seleccionar color</option>
                        <option value="Azul">Azul</option>
                        <option value="Rojo">Rojo</option>
                        <option value="Verde">Verde</option>
                        <option value="Negro">Negro</option>
                        <option value="Blanco">Blanco</option>
                        <option value="Gris">Gris</option>
                        <option value="Amarillo">Amarillo</option>
                        <option value="Rosa">Rosa</option>
                        <option value="Morado">Morado</option>
                        <option value="Naranja">Naranja</option>
                        <option value="Vino">Vino</option>
                        <option value="Turqueza">Turqueza</option>
                        <option value="Celeste">Celeste</option>
                        <option value="Verde Fluorescente">Verde Fluorescente</option>
                        <option value="Beige">Beige</option>
                        <option value="Café">Café</option>
                        <option value="Durazno">Durazno</option>
                        <option value="Camuflaje">Camuflaje</option>
                        <option value="Sin color">Sin color</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color 2
                      </label>
                      <select
                        value={formData.color2}
                        onChange={(e) => setFormData({ ...formData, color2: e.target.value })}
                        className="input-field"
                      >
                        <option value="">Seleccionar color</option>
                        <option value="Azul">Azul</option>
                        <option value="Rojo">Rojo</option>
                        <option value="Verde">Verde</option>
                        <option value="Negro">Negro</option>
                        <option value="Blanco">Blanco</option>
                        <option value="Gris">Gris</option>
                        <option value="Amarillo">Amarillo</option>
                        <option value="Rosa">Rosa</option>
                        <option value="Morado">Morado</option>
                        <option value="Naranja">Naranja</option>
                        <option value="Vino">Vino</option>
                        <option value="Turqueza">Turqueza</option>
                        <option value="Celeste">Celeste</option>
                        <option value="Verde Fluorescente">Verde Fluorescente</option>
                        <option value="Beige">Beige</option>
                        <option value="Café">Café</option>
                        <option value="Durazno">Durazno</option>
                        <option value="Camuflaje">Camuflaje</option>
                        <option value="Sin color">Sin color</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min="0"
                      step={weightUnit === 'grams' ? '1' : '0.01'}
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                      className="input-field flex-1"
                      placeholder="0"
                    />
                    <select
                      value={weightUnit}
                      onChange={(e) => {
                        const newUnit = e.target.value as 'grams' | 'kilos' | 'pounds';
                        // Si estamos editando, el peso está en gramos en la BD
                        // Si es nuevo producto, el peso está en la unidad anterior
                        if (editingProduct && formData.weight > 0) {
                          // Estamos editando: el peso en formData está en gramos
                          const weightInGrams = formData.weight;
                          const newWeight = convertFromGrams(weightInGrams, newUnit);
                          setFormData({ ...formData, weight: newWeight });
                        } else if (!editingProduct && formData.weight > 0) {
                          // Es nuevo producto: convertir de la unidad anterior a la nueva
                          const currentGrams = convertToGrams(formData.weight, weightUnit);
                          const newWeight = convertFromGrams(currentGrams, newUnit);
                          setFormData({ ...formData, weight: newWeight });
                        }
                        setWeightUnit(newUnit);
                      }}
                      className="input-field w-32"
                    >
                      <option value="grams">Gramos</option>
                      <option value="kilos">Kilos</option>
                      <option value="pounds">Libras</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    El sistema convertirá automáticamente a gramos al guardar
                  </p>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Venta 1 *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.salePrice1}
                    onChange={(e) => setFormData({ ...formData, salePrice1: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Tienda *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.salePrice2}
                    onChange={(e) => setFormData({ ...formData, salePrice2: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Este precio aparecerá en la tienda en línea</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Original (Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.originalPrice || 0}
                    onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Precio de venta en tiendas físicas (se mostrará tachado en la tienda en línea)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen del Producto
                  </label>

                  {/* Vista previa de la imagen */}
                  {formData.imageUrl && (
                    <div className="mb-3">
                      <img
                        src={formData.imageUrl}
                        alt="Vista previa"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  {/* Campo para subir archivo */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`flex items-center justify-center w-full py-2 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingImage
                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
                        }`}
                    >
                      {uploadingImage ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                          <span className="text-sm text-gray-600">Subiendo...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Upload className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formData.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* URL manual como alternativa */}
                  <div className="mt-2">
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="input-field text-sm"
                      placeholder="O pega una URL de imagen"
                    />
                  </div>
                </div>
              </div>

              {/* Imágenes Adicionales */}
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imágenes Adicionales ({formData?.images?.length || 0})
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                  {formData.images?.map((img, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={img}
                        alt={`Adicional ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar imagen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* Botón para subir más */}
                  <div className="relative aspect-square">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAdditionalImageUpload(file);
                      }}
                      className="hidden"
                      id="additional-image-upload"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="additional-image-upload"
                      className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingImage
                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
                        }`}
                    >
                      <Plus className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500 text-center px-2">Agregar foto</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Descripción detallada del producto..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setWeightUnit('pounds');
                    setFormData({
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
                      images: [],
                      origin: 'local'
                    });
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver detalles del producto */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles del Producto
              </h3>
              <button
                onClick={() => setViewingProduct(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Imagen del producto */}
              {viewingProduct.imageUrl && (
                <div className="text-center">
                  <img
                    src={viewingProduct.imageUrl}
                    alt={viewingProduct.name}
                    className="w-64 h-64 object-cover rounded-lg border border-gray-200 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(viewingProduct.imageUrl!)}
                    title="Hacer clic para ver imagen grande"
                  />
                </div>
              )}

              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Producto
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingProduct.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingProduct.sku}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingProduct.category}
                  </p>
                </div>

                {viewingProduct.category === 'Perfumes' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marca
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {viewingProduct.brand || 'Sin marca'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Perfume
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {viewingProduct.perfumeName || 'Sin nombre específico'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Talla
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {viewingProduct.size || 'Sin talla'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color 1
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {viewingProduct.color || 'Sin color'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color 2
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {viewingProduct.color2 || 'Sin color'}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingProduct.weight ? `${viewingProduct.weight}g` : 'Sin peso'}
                  </p>
                </div>

              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded min-h-[60px] prose prose-sm max-w-none">
                  {viewingProduct.description ? (
                    <div dangerouslySetInnerHTML={{ __html: viewingProduct.description }} />
                  ) : (
                    <p>Sin descripción</p>
                  )}
                </div>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo
                  </label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 p-2 rounded">
                    {formatCurrency(typeof viewingProduct.cost === 'number' ? viewingProduct.cost : 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de Envío (según peso)
                  </label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 p-2 rounded">
                    {formatCurrency(calculateShippingCost(viewingProduct.weight))}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo + Envío
                  </label>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 p-2 rounded">
                    {formatCurrency(
                      calculateCostPlusShipping(
                        viewingProduct.cost,
                        viewingProduct.weight
                      )
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Venta 1
                  </label>
                  <p className="text-lg font-semibold text-green-600 bg-gray-50 p-2 rounded">
                    {formatCurrency(typeof viewingProduct.salePrice1 === 'number' ? viewingProduct.salePrice1 : 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Tienda
                  </label>
                  <p className="text-lg font-semibold text-blue-600 bg-gray-50 p-2 rounded">
                    {formatCurrency(typeof viewingProduct.salePrice2 === 'number' ? viewingProduct.salePrice2 : 0)}
                  </p>
                </div>

                {viewingProduct.originalPrice && viewingProduct.originalPrice > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Original
                    </label>
                    <p className="text-lg font-semibold text-gray-500 bg-gray-50 p-2 rounded line-through">
                      {formatCurrency(viewingProduct.originalPrice)}
                    </p>
                  </div>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Creación
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingProduct.createdAt.toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Última Actualización
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingProduct.updatedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                onClick={() => setViewingProduct(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setViewingProduct(null);
                  handleEdit(viewingProduct);
                }}
                className="btn-primary"
              >
                Editar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para producto existente */}
      {showExistingProductModal && existingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Producto Existente
              </h3>
              <button
                onClick={() => {
                  setShowExistingProductModal(false);
                  setExistingProduct(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-semibold">!</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Ya existe un producto con este SKU
                  </p>
                  <p className="text-xs text-yellow-600">
                    SKU: {existingProduct.sku}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Detalles del Producto Existente:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Nombre:</strong> {existingProduct.name}</p>
                  <p><strong>Categoría:</strong> {existingProduct.category}</p>
                  <p><strong>Precio:</strong> {formatCurrency(typeof existingProduct.salePrice1 === 'number' ? existingProduct.salePrice1 : 0)}</p>
                  {existingProduct.size && (
                    <p><strong>Talla:</strong> {existingProduct.size}</p>
                  )}
                  {existingProduct.brand && (
                    <p><strong>Marca:</strong> {existingProduct.brand}</p>
                  )}
                  {existingProduct.perfumeName && (
                    <p><strong>Perfume:</strong> {existingProduct.perfumeName}</p>
                  )}
                  {existingProduct.color && (
                    <p><strong>Color:</strong> {existingProduct.color}</p>
                  )}
                  {existingProduct.color2 && (
                    <p><strong>Color 2:</strong> {existingProduct.color2}</p>
                  )}
                  {existingProduct.description && (
                    <p><strong>Descripción:</strong> {existingProduct.description}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowExistingProductModal(false);
                    setExistingProduct(null);
                    setFormData(prev => ({ ...prev, sku: '' }));
                  }}
                  className="btn-secondary"
                >
                  Cambiar SKU
                </button>
                <button
                  onClick={() => {
                    setShowExistingProductModal(false);
                    setExistingProduct(null);
                    handleEdit(existingProduct);
                  }}
                  className="btn-primary"
                >
                  Editar Producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver imagen grande */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage('');
              }}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Imagen del producto"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Lector de códigos de barras */}
      <SimpleBarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Escanear Código de Barras del Producto"
      />

      {/* Modal de Consolidación */}
      {showConsolidateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Confirmar Consolidación</h2>
                <button
                  onClick={() => setShowConsolidateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Se consolidarán <strong>{selectedProductsForConsolidation.size} productos</strong> en uno solo.
                  Los productos originales se mantendrán pero se ocultarán en la tienda.
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {products
                    .filter(p => selectedProductsForConsolidation.has(p.id))
                    .map(product => (
                      <div key={product.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            {product.size && `Talla: ${product.size}`}
                            {product.size && product.color && ' • '}
                            {product.color && `Color: ${product.color}`}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConsolidateModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConsolidateProducts}
                  className="flex-1 btn-primary"
                >
                  Consolidar Productos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
