import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createProduct } from '../../services/productService';
import { useToast } from '../../context/ToastContext';
import { ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

export default function NewProduct() {
  const { user, userProfile } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    price: '',
    compareAtPrice: '',
    category: '',
    stock: '1',
    sku: '',
    status: 'active',
    images: '',
    allowAffiliates: false,
    commissionRate: '10'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        title: formData.title,
        name: formData.title, // para compatibilidad
        shortDescription: formData.shortDescription,
        description: formData.description,
        price: parseFloat(formData.price),
        compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null,
        category: formData.category,
        stock: parseInt(formData.stock, 10),
        sku: formData.sku,
        status: formData.status,
        images: formData.images ? formData.images.split(',').map(url => url.trim()) : [],
        image: formData.images ? formData.images.split(',')[0].trim() : '', // compatibilidad
        sellerId: user.uid, // Ojo, usamos userId del seller
        sellerUserId: user.uid,
        sellerName: userProfile?.storeName || userProfile?.displayName || 'Vendedor',
        allowAffiliates: formData.allowAffiliates,
        commissionRate: formData.allowAffiliates ? parseFloat(formData.commissionRate) : 0
      };

      await createProduct(productData);
      addToast('Producto creado exitosamente', 'success');
      navigate('/seller/products');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/seller/products')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-xl text-gray-900 leading-tight">Nuevo Producto</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Información General</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Ej. Perfume Floral 100ml" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción corta</label>
                <input type="text" name="shortDescription" value={formData.shortDescription} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Breve resumen para tarjetas" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción completa</label>
                <textarea rows="4" name="description" value={formData.description} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" placeholder="Detalles, ingredientes, notas..." />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Imágenes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URLs de Imágenes (separadas por comas)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input type="text" name="images" value={formData.images} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="https://ejemplo.com/img1.jpg, https://ejemplo.com/img2.jpg" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Por ahora solo soportamos URLs externas. Más adelante habilitaremos la subida de archivos.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Precio</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta ($) *</label>
                  <input required type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio original (para descuento)</label>
                  <input type="number" step="0.01" min="0" name="compareAtPrice" value={formData.compareAtPrice} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Inventario y Categoría</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                    <input required type="number" min="0" name="stock" value={formData.stock} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select required name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white">
                    <option value="">Seleccionar...</option>
                    <option value="Perfumes">Perfumes</option>
                    <option value="Cosméticos">Cosméticos</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white">
                    <option value="active">Activo (Público)</option>
                    <option value="draft">Borrador (Oculto)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm md:col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Programa de Afiliados (Creadores)</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" name="allowAffiliates" checked={formData.allowAffiliates} onChange={handleChange} className="w-5 h-5 text-primary rounded focus:ring-primary" />
                  <div>
                    <p className="font-bold text-gray-900">Permitir que Creadores promocionen este producto</p>
                    <p className="text-xs text-gray-500">Los creadores podrán hacer videos de tu producto y ganar comisión por cada venta.</p>
                  </div>
                </label>

                {formData.allowAffiliates && (
                  <div className="pl-8 pt-2 transition-all">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de Comisión (%) *</label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input required type="number" step="0.1" min="1" max="90" name="commissionRate" value={formData.commissionRate} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                      <span className="text-gray-500 font-bold">%</span>
                    </div>
                    <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded">Ejemplo: Si el producto cuesta $100 y pones 10%, el creador ganará $10 por cada venta que logre.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => navigate('/seller/products')} className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-[2] bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-variant transition-colors flex items-center justify-center">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Producto'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
