import React, { useState, useEffect } from 'react';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  FileText,
  Plus,
  Eye,
  Users,
  CreditCard
} from 'lucide-react';
import { DashboardStats } from '../types';
import { sellerService } from '../services/sellerService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { entryNoteService } from '../services/entryNoteService';
import { exitNoteService } from '../services/exitNoteService';
import { exitNoteAccountingService } from '../services/exitNoteAccountingService';
import { paymentNoteService } from '../services/paymentNoteService';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalInventory: 0,
    totalValue: 0,
    pendingEntries: 0,
    pendingExits: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0
  });

  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [pendingSales, setPendingSales] = useState(0); // Added state for pending sales
  const [totalEntryNotes, setTotalEntryNotes] = useState(0);
  const [totalExitNotes, setTotalExitNotes] = useState(0);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const recalculateDebts = async () => {
    try {
      setRecalculating(true);
      console.log('🔄 Iniciando recálculo manual de deudas...');
      
      // Cargar datos actualizados
      const [sellersData, exitNotesData, paymentNotesData] = await Promise.all([
        sellerService.getAll(),
        exitNoteService.getAll(),
        paymentNoteService.getAll()
      ]);
      
      let actualTotalDebt = 0;
      
      for (const seller of sellersData) {
        // Obtener todas las notas de salida del vendedor
        const sellerExitNotes = exitNotesData.filter(note => note.sellerId === seller.id);
        
        // Obtener todas las notas de pago del vendedor (aprobadas)
        const sellerPaymentNotes = paymentNotesData.filter(note => 
          note.sellerId === seller.id && note.status === 'approved'
        );
        
        // Calcular deuda real: Notas de salida - Notas de pago aprobadas
        const totalExitNotesValue = sellerExitNotes.reduce((sum, note) => sum + note.totalPrice, 0);
        const totalPaymentNotesValue = sellerPaymentNotes.reduce((sum, note) => sum + note.totalAmount, 0);
        const sellerDebt = totalExitNotesValue - totalPaymentNotesValue;
        
        actualTotalDebt += sellerDebt;
        
        // Forzar actualización de la deuda del vendedor
        await sellerService.update(seller.id, { totalDebt: sellerDebt });
        console.log(`✅ Recalculada deuda del vendedor ${seller.name}:`);
        console.log(`  - Notas de salida: $${totalExitNotesValue}`);
        console.log(`  - Notas de pago: $${totalPaymentNotesValue}`);
        console.log(`  - Deuda final: $${sellerDebt}`);
      }
      
      setTotalDebt(actualTotalDebt);
      toast.success(`Deudas recalculadas. Total: $${actualTotalDebt.toLocaleString()}`);
      console.log(`💰 Recalculación completada. Nueva deuda total: $${actualTotalDebt}`);
      
    } catch (error) {
      console.error('Error recalculando deudas:', error);
      toast.error('Error al recalcular deudas');
    } finally {
      setRecalculating(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos en paralelo
      const [sellersData, productsData, inventoryData, entryNotesData, exitNotesData, salesData, paymentNotesData] = await Promise.all([
        sellerService.getAll(),
        productService.getAll(),
        inventoryService.getAll(),
        entryNoteService.getAll(),
        exitNoteService.getAll(),
        exitNoteAccountingService.getAll(),
        paymentNoteService.getAll()
      ]);
      
      console.log('🔍 Datos cargados:');
      console.log('- Vendedores:', sellersData.length);
      console.log('- Notas de salida:', exitNotesData.length);
      console.log('- Notas de pago:', paymentNotesData.length);
      console.log('- Vendedores con deuda previa:', sellersData.map(s => ({ name: s.name, debt: s.totalDebt })));
      
      setSellers(sellersData);
      
      // Calcular total de productos
      const totalProducts = productsData.length;
      
      // Calcular inventario total (cantidad de productos en stock)
      const totalInventory = inventoryData.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calcular valor total del inventario usando precio de venta 1
      const totalValue = inventoryData.reduce((sum, item) => {
        // Buscar el producto para obtener el precio de venta 1
        const product = productsData.find(p => p.id === item.productId);
        const salePrice = product?.salePrice1 || item.unitPrice;
        return sum + (item.quantity * salePrice);
      }, 0);
      
      // Calcular notas pendientes (solo notas de salida pueden estar pendientes)
      const pendingEntries = 0; // Las notas de entrada no pueden estar pendientes
      const pendingExits = exitNotesData.filter(note => note.status === 'pending').length;
      
      // Calcular ingresos mensuales (todas las notas de entrada del mes)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Filtrar solo notas reales (no de prueba)
      const realEntryNotes = entryNotesData.filter(note => 
        !note.supplier?.toLowerCase().includes('prueba') &&
        !note.supplier?.toLowerCase().includes('test') &&
        !note.supplier?.toLowerCase().includes('demo')
      );
      
      const monthlyRevenue = realEntryNotes
        .filter(note => {
          const noteDate = new Date(note.date);
          return noteDate.getMonth() === currentMonth && 
                 noteDate.getFullYear() === currentYear;
        })
        .reduce((sum, note) => sum + note.totalCost, 0);
      
      // Calcular gastos mensuales (notas de salida)
      // Filtrar solo notas reales (no de prueba)
      const realExitNotes = exitNotesData.filter(note => 
        !note.customer?.toLowerCase().includes('prueba') &&
        !note.customer?.toLowerCase().includes('test') &&
        !note.customer?.toLowerCase().includes('demo')
      );
      
      const monthlyExpenses = realExitNotes
        .filter(note => {
          const noteDate = new Date(note.date);
          return noteDate.getMonth() === currentMonth && 
                 noteDate.getFullYear() === currentYear;
        })
        .reduce((sum, note) => sum + note.totalPrice, 0);
      
      // Calcular deuda total de vendedores basándose en las notas de salida reales
      let actualTotalDebt = 0;
      console.log('💰 Calculando deudas de vendedores...');
      
      for (const seller of sellersData) {
        // Obtener todas las notas de salida del vendedor
        const sellerExitNotes = exitNotesData.filter(note => note.sellerId === seller.id);
        console.log(`📋 Vendedor ${seller.name} (ID: ${seller.id}):`);
        console.log(`  - Notas de salida encontradas: ${sellerExitNotes.length}`);
        
        // Mostrar detalles de cada nota
        sellerExitNotes.forEach(note => {
          console.log(`    * Nota ${note.number}: $${note.totalPrice} - Estado: ${note.status}`);
        });
        
        // Obtener todas las notas de pago del vendedor (aprobadas)
        const sellerPaymentNotes = paymentNotesData.filter(note => 
          note.sellerId === seller.id && note.status === 'approved'
        );
        
        // Calcular deuda real: Notas de salida - Notas de pago aprobadas
        const totalExitNotesValue = sellerExitNotes.reduce((sum, note) => sum + note.totalPrice, 0);
        const totalPaymentNotesValue = sellerPaymentNotes.reduce((sum, note) => sum + note.totalAmount, 0);
        const sellerDebt = totalExitNotesValue - totalPaymentNotesValue;
        
        console.log(`  - Total notas de salida: ${sellerExitNotes.length}`);
        console.log(`  - Total notas de pago aprobadas: ${sellerPaymentNotes.length}`);
        console.log(`  - Valor notas de salida: $${totalExitNotesValue}`);
        console.log(`  - Valor notas de pago: $${totalPaymentNotesValue}`);
        console.log(`  - Deuda calculada: $${sellerDebt}`);
        console.log(`  - Deuda anterior: $${seller.totalDebt || 0}`);
        
        actualTotalDebt += sellerDebt;
        
        // Actualizar la deuda del vendedor en la base de datos si es diferente
        if ((seller.totalDebt || 0) !== sellerDebt) {
          try {
            await sellerService.update(seller.id, { totalDebt: sellerDebt });
            console.log(`✅ Actualizada deuda del vendedor ${seller.name}: $${seller.totalDebt || 0} -> $${sellerDebt}`);
          } catch (error) {
            console.error(`❌ Error actualizando deuda del vendedor ${seller.name}:`, error);
          }
        } else {
          console.log(`✅ Deuda del vendedor ${seller.name} ya está correcta: $${sellerDebt}`);
        }
      }
      
      console.log(`💰 Deuda total calculada: $${actualTotalDebt}`);
      setTotalDebt(actualTotalDebt);
      
      // Cargar ventas pendientes
      const pendingSalesTotal = salesData.reduce((sum, sale) => sum + sale.totalValue, 0);
      setPendingSales(pendingSalesTotal);
      
      // Calcular total de notas
      setTotalEntryNotes(entryNotesData.length);
      setTotalExitNotes(exitNotesData.length);
      
      // Actualizar estadísticas
      setStats({
        totalProducts,
        totalInventory,
        totalValue,
        pendingEntries,
        pendingExits,
        monthlyRevenue,
        monthlyExpenses
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Productos',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Inventario Total',
      value: stats.totalInventory.toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+8%',
      changeType: 'positive' as const
    },
    {
      title: 'Valor Total',
      value: `$${stats.totalValue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+15%',
      changeType: 'positive' as const
    },
    {
      title: 'Deuda Total Vendedores',
      value: `$${totalDebt.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: 'Ventas pendientes',
      changeType: 'negative' as const,
      action: {
        label: 'Recalcular',
        onClick: recalculateDebts,
        loading: recalculating
      }
    },
    {
      title: 'Total Vendedores',
      value: sellers.length,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: 'Activos',
      changeType: 'positive' as const
    },
    {
      title: 'Notas de Entrada',
      value: totalEntryNotes,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: 'Creadas',
      changeType: 'positive' as const
    },
    {
      title: 'Notas de Salida',
      value: totalExitNotes,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: 'Creadas',
      changeType: 'positive' as const
    },
    {
      title: 'Notas Pendientes',
      value: stats.pendingExits,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: 'Solo salidas',
      changeType: 'negative' as const
    }
  ];

  const recentActivities: any[] = [];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen general del sistema</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            Ver Reportes
          </button>
          <button className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Nota
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Sin datos previos</span>
                </div>
                {stat.action && (
                  <button
                    onClick={stat.action.onClick}
                    disabled={stat.action.loading}
                    className="mt-3 px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {stat.action.loading ? 'Recalculando...' : stat.action.label}
                  </button>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Ingresos del mes</span>
              </div>
              <span className="font-semibold text-green-600">
                ${stats.monthlyRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Gastos del mes</span>
              </div>
              <span className="font-semibold text-red-600">
                ${stats.monthlyExpenses.toLocaleString()}
              </span>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Ganancia neta</span>
                <span className="font-bold text-lg text-gray-900">
                  $0.00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
          <div className="text-center py-8">
            <p className="text-gray-500">No hay actividad reciente</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Package className="h-5 w-5 text-blue-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Agregar Producto</p>
              <p className="text-sm text-gray-500">Registrar nuevo producto</p>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <FileText className="h-5 w-5 text-green-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Nota de Entrada</p>
              <p className="text-sm text-gray-500">Registrar compra</p>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <TrendingUp className="h-5 w-5 text-purple-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Ver Inventario</p>
              <p className="text-sm text-gray-500">Revisar stock</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
