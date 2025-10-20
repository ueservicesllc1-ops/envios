import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  Package, 
  Truck, 
  FileText, 
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Seller } from '../types';
import { sellerService } from '../services/sellerService';
import { shippingService, ShippingPackage } from '../services/shippingService';
import { soldProductService, SoldProduct } from '../services/soldProductService';
import toast from 'react-hot-toast';


interface ProductSummary {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  totalQuantity: number;
  totalValue: number;
  lastSaleDate: Date;
}

const SellerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [shippingPackages, setShippingPackages] = useState<ShippingPackage[]>([]);
  const [productSummary, setProductSummary] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSellerDetails();
    }
  }, [id]);

  const loadSellerDetails = async () => {
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

      // Cargar productos vendidos del vendedor
      await loadSoldProducts(id!);
      
      // Cargar paquetes de envío del vendedor
      await loadShippingPackages(id!);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading seller details:', error);
      toast.error('Error al cargar detalles del vendedor');
      setLoading(false);
    }
  };

  const loadSoldProducts = async (sellerId: string) => {
    try {
      const soldData = await soldProductService.getBySeller(sellerId);
      setSoldProducts(soldData);
    } catch (error) {
      console.error('Error loading sold products:', error);
      // En caso de error, mostrar array vacío para que la página no se rompa
      setSoldProducts([]);
    }
  };

  const loadShippingPackages = async (sellerId: string) => {
    try {
      const allPackages = await shippingService.getAll();
      const sellerPackages = allPackages.filter(pkg => 
        pkg.recipient === seller?.name || pkg.recipient.includes(seller?.name || '')
      );
      setShippingPackages(sellerPackages);
    } catch (error) {
      console.error('Error loading shipping packages:', error);
      // En caso de error, mostrar array vacío para que la página no se rompa
      setShippingPackages([]);
    }
  };

  const calculateProductSummary = (soldProducts: SoldProduct[]): ProductSummary[] => {
    const productMap = new Map<string, ProductSummary>();

    soldProducts.forEach(sale => {
      const key = sale.productId;
      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.totalQuantity += sale.quantity;
        existing.totalValue += sale.totalPrice;
        if (sale.saleDate > existing.lastSaleDate) {
          existing.lastSaleDate = sale.saleDate;
        }
      } else {
        productMap.set(key, {
          productId: sale.productId,
          productName: sale.product.name,
          sku: sale.product.sku,
          category: sale.product.category,
          totalQuantity: sale.quantity,
          totalValue: sale.totalPrice,
          lastSaleDate: sale.saleDate
        });
      }
    });

    return Array.from(productMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  };

  useEffect(() => {
    if (soldProducts.length > 0) {
      const summary = calculateProductSummary(soldProducts);
      setProductSummary(summary);
    }
  }, [soldProducts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

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
        <h3 className="mt-2 text-sm font-medium text-gray-900">Vendedor no encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">El vendedor solicitado no existe.</p>
      </div>
    );
  }

  const totalSales = soldProducts.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalShipping = shippingPackages.reduce((sum, pkg) => sum + pkg.cost, 0);
  const totalProducts = productSummary.reduce((sum, product) => sum + product.totalQuantity, 0);

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
            <h1 className="text-3xl font-bold text-gray-900">{seller.name}</h1>
            <p className="text-gray-600">Detalles del vendedor</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/seller-panel/${seller.id}`)}
          className="btn-primary flex items-center"
        >
          <Package className="h-4 w-4 mr-2" />
          Panel del Vendedor
        </button>
      </div>

      {/* Información del Vendedor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{seller.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="text-sm font-medium text-gray-900">{seller.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Ciudad</p>
                  <p className="text-sm font-medium text-gray-900">{seller.city}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Dirección</p>
                  <p className="text-sm font-medium text-gray-900">{seller.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Comisión</span>
                <span className="text-sm font-medium text-gray-900">{seller.commission}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tipo de Precio</span>
                <span className="text-sm font-medium text-gray-900">
                  {seller.priceType === 'price1' ? 'Precio 1' : 'Precio 2'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {seller.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Resumen de Ventas */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Ventas</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Ventas</span>
                <span className="text-sm font-medium text-gray-900">${totalSales.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ventas Registradas</span>
                <span className="text-sm font-medium text-gray-900">{soldProducts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Envíos</span>
                <span className="text-sm font-medium text-gray-900">{shippingPackages.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Productos Vendidos</span>
                <span className="text-sm font-medium text-gray-900">{totalProducts}</span>
              </div>
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
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
            <p className="mt-1 text-sm text-gray-500">Este vendedor no tiene ventas registradas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header">Cantidad</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {soldProducts.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">{sale.product.sku}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {sale.quantity} unidades
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        ${sale.totalPrice.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span className="ml-1">Vendido</span>
                      </span>
                    </td>
                    <td className="table-cell">
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paquetería */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Envíos</h3>
          <span className="text-sm text-gray-500">{shippingPackages.length} envíos</span>
        </div>
        
        {shippingPackages.length === 0 ? (
          <div className="text-center py-8">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay envíos</h3>
            <p className="mt-1 text-sm text-gray-500">Este vendedor no tiene envíos registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Tracking</th>
                  <th className="table-header">Destinatario</th>
                  <th className="table-header">Ciudad</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Costo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shippingPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {pkg.trackingNumber || 'Pendiente'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.recipient}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.city}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {new Date(pkg.shippingDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                        {getStatusIcon(pkg.status)}
                        <span className="ml-1">{getStatusText(pkg.status)}</span>
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        ${pkg.cost.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen de Productos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Productos Vendidos</h3>
          <span className="text-sm text-gray-500">{productSummary.length} productos únicos</span>
        </div>
        
        {productSummary.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos vendidos</h3>
            <p className="mt-1 text-sm text-gray-500">Este vendedor no tiene productos vendidos registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Producto</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Categoría</th>
                  <th className="table-header">Cantidad Total</th>
                  <th className="table-header">Valor Total</th>
                  <th className="table-header">Última Venta</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productSummary.map((product) => (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">{product.productName}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{product.sku}</span>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">{product.totalQuantity}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        ${product.totalValue.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {new Date(product.lastSaleDate).toLocaleDateString()}
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
  );
};

export default SellerDetails;
