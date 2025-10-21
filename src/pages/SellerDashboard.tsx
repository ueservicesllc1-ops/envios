import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  CreditCard,
  Banknote,
  CheckCircle,
  Clock,
  User,
  BarChart3,
  Plus,
  Eye,
  FileText,
  Truck,
  Receipt,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { sellerService } from '../services/sellerService';
import { productService } from '../services/productService';
import { soldProductService, SoldProduct } from '../services/soldProductService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { exitNoteService } from '../services/exitNoteService';
import { ExitNote } from '../types';
import { paymentNoteService } from '../services/paymentNoteService';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  priceType?: 'price1' | 'price2';
  isActive: boolean;
}

interface SellerInventoryItem {
  id: string;
  sellerId: string;
  productId: string;
  product: any;
  quantity: number;
  status: 'stock' | 'in-transit' | 'delivered';
  lastDeliveryDate: Date;
}


const SellerDashboard: React.FC = () => {
  const { user, isAdmin, isSeller, loading: authLoading } = useAuth();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sellerInventory, setSellerInventory] = useState<SellerInventoryItem[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [exitNotes, setExitNotes] = useState<ExitNote[]>([]);
  const [paymentNotes, setPaymentNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [viewingExitNote, setViewingExitNote] = useState<ExitNote | null>(null);
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [saleForm, setSaleForm] = useState({
    productId: '',
    quantity: 1,
    paymentType: 'credit' as 'credit' | 'cash',
    notes: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔐 Estado de autenticación:', { user, isAdmin, isSeller, loading });
      
      if (!user) {
        console.log('❌ Usuario no autenticado');
        setLoading(false);
        return;
      }
      
      // Buscar el vendedor por email
      const sellers = await sellerService.getAll();
      console.log('🔍 Todos los vendedores:', sellers.map(s => ({ id: s.id, email: s.email, name: s.name })));
      console.log('👤 Usuario actual:', user?.email);
      
      const currentSeller = sellers.find(s => s.email === user?.email);
      console.log('✅ Vendedor encontrado:', currentSeller ? 'SÍ' : 'NO');
      
      if (!currentSeller) {
        console.log('❌ No se encontró vendedor para email:', user?.email);
        
        // Si es luisuf@gmail.com, crear automáticamente
        if (user?.email === 'luisuf@gmail.com') {
          console.log('🚀 Creando vendedor Luisuf automáticamente...');
          try {
            const luisufData = {
              name: 'Luisuf',
              email: 'luisuf@gmail.com',
              phone: '+1234567890',
              city: 'Ciudad',
              address: 'Dirección por definir',
              commission: 10,
              priceType: 'price1' as 'price1' | 'price2',
              isActive: true
            };
            
            const luisufId = await sellerService.create(luisufData);
            console.log('✅ Luisuf creado con ID:', luisufId);
            
            // Recargar datos
            const updatedSellers = await sellerService.getAll();
            const newCurrentSeller = updatedSellers.find(s => s.email === user?.email);
            
            if (newCurrentSeller) {
              setSeller(newCurrentSeller);
              console.log('✅ Luisuf configurado correctamente');
            } else {
              toast.error('Error al configurar vendedor');
              return;
            }
          } catch (error) {
            console.error('Error creando Luisuf:', error);
            toast.error('Error al crear vendedor');
            return;
          }
        } else {
          toast.error('No tienes permisos de vendedor');
          return;
        }
      } else {
        setSeller(currentSeller);
      }

      // Cargar inventario del vendedor
      const sellerToUse = currentSeller || seller;
      if (sellerToUse) {
        const inventoryData = await sellerInventoryService.getBySeller(sellerToUse.id);
        setSellerInventory(inventoryData);
      }

      // Cargar ventas del vendedor
      if (sellerToUse) {
        const salesData = await soldProductService.getBySeller(sellerToUse.id);
        setSoldProducts(salesData);

        // Cargar notas de salida del vendedor
        const exitNotesData = await exitNoteService.getAll();
        const sellerExitNotes = exitNotesData.filter(note => note.sellerId === sellerToUse.id);
        setExitNotes(sellerExitNotes);

        // Cargar notas de pago del vendedor
        const paymentNotesData = await paymentNoteService.getAll();
        const sellerPaymentNotes = paymentNotesData.filter(note => note.sellerId === sellerToUse.id);
        setPaymentNotes(sellerPaymentNotes);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
      setLoading(false);
    }
  }, [user, isAdmin, isSeller]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!seller) return;

      const product = sellerInventory.find(item => item.id === saleForm.productId);
      if (!product) {
        toast.error('Producto no encontrado');
        return;
      }

      if (product.quantity < saleForm.quantity) {
        toast.error('Cantidad insuficiente en inventario');
        return;
      }

      // Obtener precio según el tipo del vendedor
      const unitPrice = seller.priceType === 'price2' 
        ? product.product.salePrice2 
        : product.product.salePrice1;

      const totalPrice = unitPrice * saleForm.quantity;

      // Crear la venta
      await soldProductService.create({
        sellerId: seller.id,
        productId: product.productId,
        product: product.product,
        quantity: saleForm.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        saleDate: new Date(),
        createdAt: new Date(),
        paymentType: saleForm.paymentType,
        status: 'pending',
        notes: saleForm.notes
      });

      // Actualizar inventario del vendedor
      await sellerInventoryService.updateQuantity(
        saleForm.productId, 
        product.quantity - saleForm.quantity
      );

      toast.success('Venta registrada exitosamente');
      setShowSaleModal(false);
      setSaleForm({
        productId: '',
        quantity: 1,
        paymentType: 'credit',
        notes: ''
      });
      
      // Recargar datos
      await loadData();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Error al registrar la venta');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Desconocido';
    }
  };

  const getInventoryStatusColor = (status: string) => {
    switch (status) {
      case 'stock':
        return 'text-green-600 bg-green-100';
      case 'in-transit':
        return 'text-blue-600 bg-blue-100';
      case 'delivered':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getInventoryStatusText = (status: string) => {
    switch (status) {
      case 'stock':
        return 'En Stock';
      case 'in-transit':
        return 'En Tránsito';
      case 'delivered':
        return 'Entregado';
      default:
        return 'Desconocido';
    }
  };

  // Estadísticas
  const totalInventory = sellerInventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalSales = soldProducts.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const pendingSales = soldProducts.filter(sale => sale.status === 'pending').length;
  const paidSales = soldProducts.filter(sale => sale.status === 'paid').length;
  const totalExitNotes = exitNotes.length;
  const pendingExitNotes = exitNotes.filter(note => note.status === 'pending').length;
  const deliveredExitNotes = exitNotes.filter(note => note.status === 'delivered').length;
  const totalPaymentNotes = paymentNotes.length;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes permisos de vendedor</h3>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inventario Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalInventory}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900">${totalSales.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ventas Pagadas</p>
              <p className="text-2xl font-bold text-gray-900">{paidSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Notas de Salida</p>
              <p className="text-2xl font-bold text-gray-900">{totalExitNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingExitNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entregadas</p>
              <p className="text-2xl font-bold text-gray-900">{deliveredExitNotes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Receipt className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Notas de Pago</p>
              <p className="text-2xl font-bold text-gray-900">{totalPaymentNotes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de ventas recientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Ventas Recientes</h3>
        </div>
        <div className="p-6">
          {soldProducts.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
              <p className="mt-1 text-sm text-gray-500">Tus ventas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {soldProducts.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{sale.product.name}</p>
                      <p className="text-sm text-gray-500">
                        Cantidad: {sale.quantity} | 
                        {sale.paymentType === 'credit' ? (
                          <CreditCard className="inline h-4 w-4 ml-1 text-blue-500" />
                        ) : (
                          <Banknote className="inline h-4 w-4 ml-1 text-green-500" />
                        )}
                        {sale.paymentType === 'credit' ? ' Crédito' : ' Efectivo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                      {getStatusText(sale.status)}
                    </span>
                    <span className="text-sm font-medium text-gray-900">${sale.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mi Inventario</h2>
      </div>

      {sellerInventory.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes productos en inventario</h3>
          <p className="mt-1 text-sm text-gray-500">Los productos aparecerán aquí cuando recibas entregas.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sellerInventory.map((item) => (
              <li key={item.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        SKU: {item.product.sku} | 
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getInventoryStatusColor(item.status)}`}>
                      {getInventoryStatusText(item.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(item.lastDeliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mis Ventas</h2>
        <button
          onClick={() => setShowSaleModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Venta
        </button>
      </div>

      {soldProducts.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
          <p className="mt-1 text-sm text-gray-500">Registra tu primera venta.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {soldProducts.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${sale.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${sale.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.paymentType === 'credit' ? (
                      <span className="flex items-center text-blue-600">
                        <CreditCard className="h-4 w-4 mr-1" />
                        Crédito
                      </span>
                    ) : (
                      <span className="flex items-center text-green-600">
                        <Banknote className="h-4 w-4 mr-1" />
                        Efectivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                      {getStatusText(sale.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderExitNotes = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mis Notas de Salida</h2>
      </div>

      {exitNotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de salida</h3>
          <p className="mt-1 text-sm text-gray-500">Las notas de salida aparecerán aquí cuando el administrador las genere.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exitNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {note.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(note.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {note.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${note.totalPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      note.status === 'delivered' 
                        ? 'bg-green-100 text-green-800'
                        : note.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {note.status === 'delivered' ? 'Entregada' : 
                       note.status === 'pending' ? 'Pendiente' : 
                       note.status === 'received' ? 'Recibida' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setViewingExitNote(note)}
                      className="text-primary-600 hover:text-primary-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPaymentNotes = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mis Notas de Pago</h2>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Nota de Pago
        </button>
      </div>

      {paymentNotes.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de pago</h3>
          <p className="mt-1 text-sm text-gray-500">Crea tu primera nota de pago para reportar pagos a la empresa.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {note.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${note.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      note.status === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : note.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {note.status === 'approved' ? 'Aprobada' : 
                       note.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {/* Ver detalles */}}
                      className="text-primary-600 hover:text-primary-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-[200px]">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel del Vendedor</h1>
              <p className="text-sm text-gray-600">Bienvenido, {seller.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Tipo de precio: {seller.priceType === 'price2' ? 'Precio 2' : 'Precio 1'}
              </span>
              
              {/* Información del usuario */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.displayName || seller.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email || seller.email}
                  </p>
                </div>
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || seller.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary-600">
                      {(user?.displayName || seller.name).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'dashboard'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="h-5 w-5 inline mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveSection('inventory')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'inventory'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="h-5 w-5 inline mr-2" />
            Inventario
          </button>
          <button
            onClick={() => setActiveSection('sales')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'sales'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShoppingCart className="h-5 w-5 inline mr-2" />
            Ventas
          </button>
          <button
            onClick={() => setActiveSection('exit-notes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'exit-notes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-5 w-5 inline mr-2" />
            Notas de Salida
          </button>
          <button
            onClick={() => setActiveSection('payment-notes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'payment-notes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Receipt className="h-5 w-5 inline mr-2" />
            Notas de Pago
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'inventory' && renderInventory()}
        {activeSection === 'sales' && renderSales()}
        {activeSection === 'exit-notes' && renderExitNotes()}
        {activeSection === 'payment-notes' && renderPaymentNotes()}
      </div>

      {/* Modal de Nueva Venta */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Venta</h3>
              <button
                onClick={() => setShowSaleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto
                </label>
                <select
                  required
                  value={saleForm.productId}
                  onChange={(e) => setSaleForm({...saleForm, productId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar producto</option>
                  {sellerInventory
                    .filter(item => item.status === 'delivered' && item.quantity > 0)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.product.name} - Stock: {item.quantity}
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
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({...saleForm, quantity: parseInt(e.target.value) || 1})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Pago
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="credit"
                      checked={saleForm.paymentType === 'credit'}
                      onChange={(e) => setSaleForm({...saleForm, paymentType: e.target.value as 'credit' | 'cash'})}
                      className="mr-2"
                    />
                    <CreditCard className="h-4 w-4 mr-1 text-blue-500" />
                    Crédito
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentType"
                      value="cash"
                      checked={saleForm.paymentType === 'cash'}
                      onChange={(e) => setSaleForm({...saleForm, paymentType: e.target.value as 'credit' | 'cash'})}
                      className="mr-2"
                    />
                    <Banknote className="h-4 w-4 mr-1 text-green-500" />
                    Efectivo
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm({...saleForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
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

      {/* Modal de Nueva Nota de Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Nota de Pago</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Selección de ventas */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Seleccionar Ventas Pagadas para Pagar a la Empresa</h4>
                <p className="text-xs text-gray-500 mb-3">Selecciona las ventas que ya te pagaron y quieres pagar a la empresa.</p>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {soldProducts.filter(sale => sale.status === 'paid').length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No tienes ventas pagadas para pagar a la empresa</p>
                  ) : (
                    <div className="space-y-2">
                      {soldProducts
                        .filter(sale => sale.status === 'paid')
                        .map((sale) => (
                          <label key={sale.id} className="flex items-center p-3 bg-white rounded border hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedSales.includes(sale.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSales([...selectedSales, sale.id]);
                                } else {
                                  setSelectedSales(selectedSales.filter(id => id !== sale.id));
                                }
                              }}
                              className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-900">{sale.product.name}</span>
                                <span className="text-sm font-medium text-gray-900">${sale.totalPrice.toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Cantidad: {sale.quantity} | Fecha: {new Date(sale.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen del pago */}
              {selectedSales.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Resumen del Pago</h4>
                  <div className="space-y-1">
                    {selectedSales.map(saleId => {
                      const sale = soldProducts.find(s => s.id === saleId);
                      return sale ? (
                        <div key={saleId} className="flex justify-between text-sm">
                          <span>{sale.product.name}</span>
                          <span>${sale.totalPrice.toFixed(2)}</span>
                        </div>
                      ) : null;
                    })}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total a Pagar:</span>
                        <span>${selectedSales.reduce((total, saleId) => {
                          const sale = soldProducts.find(s => s.id === saleId);
                          return total + (sale ? sale.totalPrice : 0);
                        }, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Implementar creación de nota de pago
                    console.log('Crear nota de pago con ventas:', selectedSales);
                    setShowPaymentModal(false);
                    setSelectedSales([]);
                  }}
                  disabled={selectedSales.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Crear Nota de Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Nota de Salida */}
      {viewingExitNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles de Nota de Salida</h3>
              <button
                onClick={() => setViewingExitNote(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Información General</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Número:</span> {viewingExitNote.number}</p>
                  <p><span className="font-medium">Fecha:</span> {new Date(viewingExitNote.date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Cliente:</span> {viewingExitNote.customer}</p>
                  <p><span className="font-medium">Estado:</span> 
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                      viewingExitNote.status === 'delivered' 
                        ? 'bg-green-100 text-green-800'
                        : viewingExitNote.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingExitNote.status === 'delivered' ? 'Entregada' : 
                       viewingExitNote.status === 'pending' ? 'Pendiente' : 
                       viewingExitNote.status === 'received' ? 'Recibida' : 'Cancelada'}
                    </span>
                  </p>
                  {viewingExitNote.notes && (
                    <p><span className="font-medium">Notas:</span> {viewingExitNote.notes}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Totales</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Total:</span> ${viewingExitNote.totalPrice.toLocaleString()}</p>
                  <p><span className="font-medium">Productos:</span> {viewingExitNote.items.length}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Productos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talla</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewingExitNote.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.product.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.size || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${item.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
