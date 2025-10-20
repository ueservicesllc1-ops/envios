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
// import { syncService } from '../services/syncService';
import { exitNoteAccountingService } from '../services/exitNoteAccountingService';

const Dashboard: React.FC = () => {
  const [stats] = useState<DashboardStats>({
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const sellersData = await sellerService.getAll();
      setSellers(sellersData);
      
      // Calcular deuda total de vendedores
      const debt = sellersData.reduce((sum, seller) => sum + (seller.totalDebt || 0), 0);
      setTotalDebt(debt);
      
      // Cargar ventas pendientes (notas de salida)
      const salesData = await exitNoteAccountingService.getAll();
      const pendingSalesTotal = salesData.reduce((sum, sale) => sum + sale.totalValue, 0);
      setPendingSales(pendingSalesTotal);
      
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
      value: `$${pendingSales.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      change: 'Ventas pendientes',
      changeType: 'negative' as const
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
      title: 'Notas Pendientes',
      value: stats.pendingEntries + stats.pendingExits,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '-3',
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
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">Sin datos previos</span>
                </div>
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
