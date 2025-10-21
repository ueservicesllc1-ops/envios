import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  X,
  ShoppingCart
} from 'lucide-react';
import { Seller } from '../types';
import { sellerService } from '../services/sellerService';
import { productService } from '../services/productService';
import { soldProductService, SoldProduct } from '../services/soldProductService';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  salePrice1: number;
  salePrice2: number;
}

const SellerPanel: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    notes: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar datos del vendedor
      const sellerData = await sellerService.getById(id!);
      if (!sellerData) {
        toast.error('Vendedor no encontrado');
        navigate('/sellers');
        return;
      }
      setSeller(sellerData);

      // Cargar productos disponibles
      const productsData = await productService.getAll();
      setProducts(productsData);

      // Cargar productos vendidos del vendedor
      const soldData = await soldProductService.getBySeller(id!);
      setSoldProducts(soldData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
      setLoading(false);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (!selectedProduct) {
        toast.error('Por favor selecciona un producto');
        return;
      }

      const soldProductData = {
        sellerId: id!,
        productId: formData.productId,
        product: selectedProduct,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        totalPrice: formData.unitPrice * formData.quantity,
        saleDate: new Date(),
        notes: formData.notes,
        createdAt: new Date(),
        paymentType: 'credit' as const,
        status: 'pending' as const
      };

      const soldProductId = await soldProductService.create(soldProductData);
      const newSoldProduct: SoldProduct = {
        id: soldProductId,
        ...soldProductData
      };

      setSoldProducts([newSoldProduct, ...soldProducts]);
      setShowModal(false);
      setFormData({
        productId: '',
        quantity: 1,
        unitPrice: 0,
        notes: ''
      });
    } catch (error) {
      console.error('Error creating sold product:', error);
      toast.error('Error al registrar la venta');
    }
  };

  const openModal = () => {
    setFormData({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      notes: ''
    });
    setShowModal(true);
  };

  const getProductPrice = (product: Product) => {
    if (!seller) return 0;
    return seller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
  };

  const totalSales = soldProducts.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalProducts = soldProducts.reduce((sum, sale) => sum + sale.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Vendedor no encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">El vendedor solicitado no existe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/sellers')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de {seller.name}</h1>
            <p className="text-gray-600">Registra tus ventas y productos vendidos</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Venta
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900">${totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Productos Vendidos</p>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas Registradas</p>
              <p className="text-2xl font-bold text-gray-900">{soldProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Productos Vendidos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Productos Vendidos</h3>
          <span className="text-sm text-gray-500">{soldProducts.length} ventas</span>
        </div>
        
        {soldProducts.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza registrando tu primera venta.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Producto</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Cantidad</th>
                  <th className="table-header">Precio Unit.</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {soldProducts.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">{sale.product.name}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{sale.product.sku}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">{sale.quantity}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">${sale.unitPrice.toLocaleString()}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">${sale.totalPrice.toLocaleString()}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{sale.notes || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para registrar venta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Registrar Venta</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const product = products.find(p => p.id === productId);
                    setFormData({
                      ...formData,
                      productId,
                      unitPrice: product ? getProductPrice(product) : 0
                    });
                  }}
                  className="input-field"
                >
                  <option value="">Seleccionar producto</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${getProductPrice(product).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="input-field"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Unitario
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="input-field"
                  placeholder="Información adicional sobre la venta"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total:</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${(formData.unitPrice * formData.quantity).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Registrar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerPanel;
