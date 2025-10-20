import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Filter, Package, X, Database, Upload, Image, Scan } from 'lucide-react';
import { Product } from '../types';
import { productService } from '../services/productService';
import { addSampleProducts } from '../utils/addSampleProducts';
import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SimpleBarcodeScanner from '../components/SimpleBarcodeScanner';
import toast from 'react-hot-toast';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    variant: '',
    sku: '',
    cost: 0,
    salePrice1: 0,
    salePrice2: 0,
    barcode: '',
    imageUrl: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

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

  const handleBarcodeScan = (barcode: string) => {
    // Verificar si el SKU ya existe
    const existingProduct = products.find(p => p.sku === barcode);
    if (existingProduct) {
      toast.error(`Ya existe un producto con el SKU: ${barcode}`);
      return;
    }
    
    // Auto-rellenar el campo SKU
    setFormData(prev => ({
      ...prev,
      sku: barcode
    }));
    
    toast.success(`SKU escaneado: ${barcode}`);
    setShowScanner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...formData } : p));
      } else {
        const id = await productService.create(formData);
        const newProduct: Product = {
          id,
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setProducts([newProduct, ...products]);
      }
      
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        variant: '',
        sku: '',
        cost: 0,
        salePrice1: 0,
        salePrice2: 0,
        barcode: '',
        imageUrl: ''
      });
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      variant: product.variant || '',
      sku: product.sku,
      cost: product.cost,
      salePrice1: product.salePrice1,
      salePrice2: product.salePrice2,
      barcode: product.barcode || '',
      imageUrl: product.imageUrl || ''
    });
    setShowModal(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600">Gestiona tu catálogo de productos</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
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
          <div className="flex items-center space-x-3">
            <button className="btn-secondary flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
            <span className="text-sm text-gray-500">
              {filteredProducts.length} productos encontrados
            </span>
          </div>
        </div>
      </div>

      {/* Products Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio 1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio 2</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {product.imageUrl ? (
                          <img
                            className="h-10 w-10 rounded-lg object-cover"
                            src={product.imageUrl}
                            alt={product.name}
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
                          {product.description}
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
                    {product.variant && (
                      <div className="mt-1 text-xs text-gray-500">
                        {product.variant}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      ${product.cost.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      ${product.salePrice1.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      ${product.salePrice2.toLocaleString()}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                  setFormData({
                    name: '',
                    description: '',
                    category: '',
                    variant: '',
                    sku: '',
                    cost: 0,
                    salePrice1: 0,
                    salePrice2: 0,
                    barcode: '',
                    imageUrl: ''
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
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
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
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría * (Actualizado)
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Electrónicos">Electrónicos</option>
                    <option value="Ropa">Ropa</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Deportes">Deportes</option>
                    <option value="Libros">Libros</option>
                    <option value="ZAPATOS">ZAPATOS</option>
                    <option value="VITAMINAS">VITAMINAS</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variante
                  </label>
                  <select
                    value={formData.variant}
                    onChange={(e) => setFormData({...formData, variant: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Seleccionar variante</option>
                    <option value="Talla S">Talla S</option>
                    <option value="Talla M">Talla M</option>
                    <option value="Talla L">Talla L</option>
                    <option value="Talla XL">Talla XL</option>
                    <option value="Talla XXL">Talla XXL</option>
                    <option value="Talla 36">Talla 36</option>
                    <option value="Talla 37">Talla 37</option>
                    <option value="Talla 38">Talla 38</option>
                    <option value="Talla 39">Talla 39</option>
                    <option value="Talla 40">Talla 40</option>
                    <option value="Talla 41">Talla 41</option>
                    <option value="Talla 42">Talla 42</option>
                    <option value="Talla 43">Talla 43</option>
                    <option value="Talla 44">Talla 44</option>
                    <option value="Talla 45">Talla 45</option>
                    <option value="Color Azul">Color Azul</option>
                    <option value="Color Rojo">Color Rojo</option>
                    <option value="Color Verde">Color Verde</option>
                    <option value="Color Negro">Color Negro</option>
                    <option value="Color Blanco">Color Blanco</option>
                    <option value="Color Gris">Color Gris</option>
                    <option value="Color Amarillo">Color Amarillo</option>
                    <option value="Color Rosa">Color Rosa</option>
                    <option value="Color Morado">Color Morado</option>
                    <option value="Color Naranja">Color Naranja</option>
                    <option value="Sin variante">Sin variante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="input-field"
                    placeholder="1234567890123"
                  />
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
                    onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
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
                    onChange={(e) => setFormData({...formData, salePrice1: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Venta 2 *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.salePrice2}
                    onChange={(e) => setFormData({...formData, salePrice2: parseFloat(e.target.value) || 0})}
                    className="input-field"
                    placeholder="0.00"
                  />
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
                      className={`flex items-center justify-center w-full py-2 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        uploadingImage 
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
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                      className="input-field text-sm"
                      placeholder="O pega una URL de imagen"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                    setFormData({
                      name: '',
                      description: '',
                      category: '',
                      variant: '',
                      sku: '',
                      cost: 0,
                      salePrice1: 0,
                      salePrice2: 0,
                      barcode: '',
                      imageUrl: ''
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

      {/* Lector de códigos de barras */}
      <SimpleBarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Escanear Código de Barras del Producto"
      />
    </div>
  );
};

export default Products;
