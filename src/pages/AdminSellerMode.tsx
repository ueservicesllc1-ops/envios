import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Plus,
  ShoppingCart,
  User,
  LogOut,
  Menu,
  X,
  Truck,
  RotateCcw,
  BarChart3,
  Home
} from 'lucide-react';
import { sellerService } from '../services/sellerService';
import { productService } from '../services/productService';
import { soldProductService, SoldProduct } from '../services/soldProductService';
import { sellerInventoryService, SellerInventoryItem } from '../services/sellerInventoryService';
import { paymentNoteService, PaymentNote } from '../services/paymentNoteService';
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

const AdminSellerMode: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [sellerInventory, setSellerInventory] = useState<SellerInventoryItem[]>([]);
  const [paymentNotes, setPaymentNotes] = useState<PaymentNote[]>([]);
  const [shippingPackages, setShippingPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPaymentNotification, setShowPaymentNotification] = useState(false);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    paymentType: 'credit' as 'credit' | 'cash',
    notes: ''
  });

  const navigation = [
    { name: 'Dashboard', href: 'dashboard', icon: Home },
    { name: 'Inventario', href: 'inventory', icon: Package },
    { name: 'Ventas', href: 'sales', icon: TrendingUp },
    { name: 'Notas de Pago', href: 'payment-notes', icon: BarChart3 },
    { name: 'Paquetes', href: 'packages', icon: Truck },
    { name: 'Devoluciones', href: 'returns', icon: RotateCcw },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar vendedores disponibles
      const sellersData = await sellerService.getAll();
      setSellers(sellersData);

      // Cargar productos disponibles
      const productsData = await productService.getAll();
      setProducts(productsData);

      // Cargar pagos pendientes
      await loadAllPendingPayments();

      // Si hay vendedores, seleccionar el primero por defecto
      if (sellersData.length > 0) {
        setSelectedSeller(sellersData[0]);
        await loadSoldProducts(sellersData[0].id);
        await loadSellerInventory(sellersData[0].id);
        await loadPaymentNotes(sellersData[0].id);
        await loadShippingPackages(sellersData[0].id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recargar pagos pendientes cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllPendingPayments();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadSoldProducts = async (sellerId: string) => {
    try {
      const soldData = await soldProductService.getBySeller(sellerId);
      setSoldProducts(soldData);
    } catch (error) {
      console.error('Error loading sold products:', error);
      setSoldProducts([]);
    }
  };

  const loadSellerInventory = async (sellerId: string) => {
    try {
      const inventoryData = await sellerInventoryService.getSellerInventory(sellerId);
      setSellerInventory(inventoryData);
    } catch (error) {
      console.error('Error loading seller inventory:', error);
      setSellerInventory([]);
    }
  };

  const loadPaymentNotes = async (sellerId: string) => {
    try {
      const paymentNotesData = await paymentNoteService.getBySeller(sellerId);
      setPaymentNotes(paymentNotesData);
    } catch (error) {
      console.error('Error loading payment notes:', error);
      setPaymentNotes([]);
    }
  };

  const loadAllPendingPayments = async () => {
    try {
      const allPaymentNotes = await paymentNoteService.getAll();
      const pendingPayments = allPaymentNotes.filter(note => note.status === 'pending');
      setPendingPaymentCount(pendingPayments.length);
      
      // Mostrar notificación si hay pagos pendientes
      if (pendingPayments.length > 0) {
        setShowPaymentNotification(true);
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
          setShowPaymentNotification(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
    }
  };

  const loadShippingPackages = async (sellerId: string) => {
    try {
      // Simular paquetes de envío para el vendedor
      const mockPackages = [
        {
          id: '1',
          trackingNumber: 'EC123456789PE',
          recipient: selectedSeller?.name || 'Vendedor',
          status: 'in-transit',
          shippingDate: new Date('2024-01-15'),
          cost: 5.50,
          weight: 1.2,
          dimensions: 'Funda'
        },
        {
          id: '2',
          trackingNumber: 'EC987654321PE',
          recipient: selectedSeller?.name || 'Vendedor',
          status: 'delivered',
          shippingDate: new Date('2024-01-10'),
          deliveryDate: new Date('2024-01-12'),
          cost: 4.20,
          weight: 0.8,
          dimensions: 'Funda'
        }
      ];
      setShippingPackages(mockPackages);
    } catch (error) {
      console.error('Error loading shipping packages:', error);
      setShippingPackages([]);
    }
  };

  const handleSellerChange = async (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    if (seller) {
      setSelectedSeller(seller);
      await loadSoldProducts(sellerId);
      await loadSellerInventory(sellerId);
      await loadPaymentNotes(sellerId);
      await loadShippingPackages(sellerId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (!selectedProduct || !selectedSeller) {
        toast.error('Por favor selecciona un producto y vendedor');
        return;
      }

      const soldProductData = {
        sellerId: selectedSeller.id,
        productId: formData.productId,
        product: selectedProduct,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        totalPrice: formData.unitPrice * formData.quantity,
        saleDate: new Date(),
        notes: formData.notes,
        createdAt: new Date(),
        paymentType: formData.paymentType,
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
        paymentType: 'credit',
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
      paymentType: 'credit',
      notes: ''
    });
    setShowModal(true);
  };

  const getProductPrice = (product: Product) => {
    if (!selectedSeller) return 0;
    return selectedSeller.priceType === 'price2' ? product.salePrice2 : product.salePrice1;
  };

  const totalInventoryValue = sellerInventory.reduce((sum, item) => sum + item.totalValue, 0);
  const totalInventoryQuantity = sellerInventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalSales = soldProducts.reduce((sum, sale) => sum + sale.totalPrice, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!selectedSeller) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay vendedores disponibles</h3>
        <p className="mt-1 text-sm text-gray-500">Necesitas crear vendedores primero.</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'inventory':
        return renderInventory();
      case 'sales':
        return renderSales();
      case 'payment-notes':
        return renderPaymentNotes();
      case 'packages':
        return renderPackages();
      case 'returns':
        return renderReturns();
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total de Productos</p>
              <p className="text-2xl font-bold text-gray-900">${totalInventoryValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Productos en Inventario</p>
              <p className="text-2xl font-bold text-gray-900">{totalInventoryQuantity}</p>
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
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Mi Inventario</h3>
          <p className="text-sm text-gray-600">Productos entregados desde notas de salida</p>
        </div>
        
        {sellerInventory.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos en inventario</h3>
            <p className="mt-1 text-sm text-gray-500">No se han entregado productos a este vendedor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Entrega</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sellerInventory.map((item) => (
                  <tr key={item.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{item.quantity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${item.unitPrice.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${item.totalValue.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {new Date(item.lastDeliveryDate).toLocaleDateString()}
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

  const renderSales = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Mis Ventas</h3>
        <button
          onClick={openModal}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Venta
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        {soldProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza registrando la primera venta.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Pago</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {soldProducts.map((sale, index) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sale.product.name}</div>
                        <div className="text-sm text-gray-500">{sale.product.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">${sale.unitPrice.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.paymentType === 'cash' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {sale.paymentType === 'cash' ? 'Contado' : 'Crédito'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status === 'paid' ? 'Pagado' : 'Pendiente'}
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

  const renderPaymentNotes = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Notas de Pago</h3>
        <button
          onClick={() => {/* TODO: Implementar modal de nueva nota de pago */}}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Nota de Pago
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        {paymentNotes.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de pago</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primera nota de pago.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentNotes.map((note, index) => (
                  <tr key={note.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{note.number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">${note.totalAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        note.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : note.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {note.status === 'approved' ? 'Aprobada' : 
                         note.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-primary-600 hover:text-primary-900 text-sm font-medium">
                        Ver Detalles
                      </button>
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

  const renderPackages = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Paquetes Enviados</h3>
        </div>
        
        {shippingPackages.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay paquetes</h3>
            <p className="mt-1 text-sm text-gray-500">No se han enviado paquetes aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Envío</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shippingPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{pkg.trackingNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pkg.status === 'delivered' 
                          ? 'bg-green-100 text-green-800' 
                          : pkg.status === 'in-transit'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {pkg.status === 'delivered' ? 'Entregado' : 
                         pkg.status === 'in-transit' ? 'En Tránsito' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {new Date(pkg.shippingDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{pkg.weight} kg</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">${pkg.cost.toLocaleString()}</span>
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

  const renderReturns = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Devoluciones</h3>
        </div>
        
        <div className="text-center py-12">
          <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay devoluciones</h3>
          <p className="mt-1 text-sm text-gray-500">No se han registrado devoluciones.</p>
          <div className="mt-6">
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center mx-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Solicitar Devolución
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Panel Vendedor</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-5 px-2">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveSection(item.href)}
              className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md mb-1 ${
                activeSection === item.href
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="ml-4">
                  <h1 className="text-xl font-semibold text-gray-900">Modo Vendedor</h1>
                  <p className="text-sm text-gray-600">Simulando como: {selectedSeller?.name}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Selector de vendedor */}
                <select
                  value={selectedSeller?.id || ''}
                  onChange={(e) => handleSellerChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {sellers.map(seller => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
                
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
        </div>

        {/* Contenido */}
        <div className="flex-1 p-6">
          {renderContent()}
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
                  Tipo de Pago
                </label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as 'credit' | 'cash' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="credit">Crédito</option>
                  <option value="cash">Contado</option>
                </select>
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

      {/* Popup flotante para notificaciones de pagos pendientes */}
      {showPaymentNotification && pendingPaymentCount > 0 && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm border-l-4 border-blue-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-400 rounded-full p-2 mr-3">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">¡Nuevas Notas de Pago!</h4>
                  <p className="text-xs text-blue-100">
                    {pendingPaymentCount} {pendingPaymentCount === 1 ? 'nota pendiente' : 'notas pendientes'} de aprobación
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentNotification(false)}
                className="text-blue-200 hover:text-white ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => {
                  setActiveSection('payment-notes');
                  setShowPaymentNotification(false);
                }}
                className="bg-blue-400 hover:bg-blue-300 text-white text-xs px-3 py-1 rounded transition-colors"
              >
                Ver Notas
              </button>
              <button
                onClick={() => setShowPaymentNotification(false)}
                className="bg-transparent border border-blue-300 hover:bg-blue-300 text-white text-xs px-3 py-1 rounded transition-colors"
              >
                Después
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSellerMode;