import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Plus,
  ShoppingCart,
  User,
  LogOut
} from 'lucide-react';
import { sellerService } from '../services/sellerService';
import { productService } from '../services/productService';
import { soldProductService, SoldProduct } from '../services/soldProductService';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  salePrice1: number;
  salePrice2: number;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  commission: number;
  priceType?: 'price1' | 'price2';
  isActive: boolean;
}

const SellerBasicPanel: React.FC = () => {
  const { user, isSeller } = useAuth();
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

  useEffect(() => {
    if (!isSeller) {
      navigate('/');
      return;
    }
    loadData();
  }, [isSeller, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Buscar el vendedor por email
      const sellers = await sellerService.getAll();
      const currentSeller = sellers.find(s => s.email === user?.email);
      
      if (!currentSeller) {
        toast.error('No tienes permisos de vendedor');
        navigate('/');
        return;
      }
      
      setSeller(currentSeller);

      // Cargar productos disponibles
      const productsData = await productService.getAll();
      setProducts(productsData);

      // Cargar productos vendidos del vendedor
      const soldData = await soldProductService.getBySeller(currentSeller.id);
      setSoldProducts(soldData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (!selectedProduct || !seller) {
        toast.error('Por favor selecciona un producto');
        return;
      }

      const soldProductData = {
        sellerId: seller.id,
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error al cerrar sesión');
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
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes permisos</h3>
        <p className="mt-1 text-sm text-gray-500">Contacta al administrador para obtener acceso.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Panel de Vendedor</h1>
                <p className="text-sm text-gray-600">Bienvenido, {seller.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
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

            <div className="bg-white rounded-lg shadow p-6">
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

            <div className="bg-white rounded-lg shadow p-6">
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

          {/* Botón para registrar venta */}
          <div className="flex justify-center">
            <button
              onClick={openModal}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Registrar Nueva Venta
            </button>
          </div>

          {/* Productos Vendidos */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Mis Ventas</h3>
            </div>
            
            {soldProducts.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
                <p className="mt-1 text-sm text-gray-500">Comienza registrando tu primera venta.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {soldProducts.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{sale.product.name}</div>
                            <div className="text-sm text-gray-500">{sale.product.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{sale.quantity}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">${sale.unitPrice.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">${sale.totalPrice.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {new Date(sale.saleDate).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
                ×
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
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

export default SellerBasicPanel;
