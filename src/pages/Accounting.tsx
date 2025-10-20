import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Search, Filter, Plus, Eye, Edit, Truck } from 'lucide-react';
import { AccountingEntry } from '../types';
import { shippingAccountingService, ShippingExpense } from '../services/shippingAccountingService';
import { exitNoteAccountingService, ExitNoteSale } from '../services/exitNoteAccountingService';
import { entryNoteAccountingService, EntryNoteExpense } from '../services/entryNoteAccountingService';
import toast from 'react-hot-toast';

const Accounting: React.FC = () => {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [shippingExpenses, setShippingExpenses] = useState<ShippingExpense[]>([]);
  const [exitNoteSales, setExitNoteSales] = useState<ExitNoteSale[]>([]);
  const [, setEntryNoteExpenses] = useState<EntryNoteExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [, setShowModal] = useState(false);
  const [totalShippingCost, setTotalShippingCost] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Array vacío para datos reales
  // const sampleEntries: AccountingEntry[] = [];

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      // Cargar datos reales desde Firebase
      setEntries([]);
      
      // Cargar gastos de paquetería
      const shippingData = await shippingAccountingService.getAll();
      setShippingExpenses(shippingData);
      
      // Cargar ventas de notas de salida
      const salesData = await exitNoteAccountingService.getAll();
      setExitNoteSales(salesData);
      
      // Cargar gastos de notas de entrada
      const expensesData = await entryNoteAccountingService.getAll();
      setEntryNoteExpenses(expensesData);
      
      // Calcular totales
      const shippingTotal = shippingData.reduce((sum, expense) => sum + expense.cost, 0);
      const salesTotal = salesData.reduce((sum, sale) => sum + sale.totalValue, 0);
      const expensesTotal = expensesData.reduce((sum, expense) => sum + expense.totalCost, 0);
      
      setTotalShippingCost(shippingTotal);
      setTotalSales(salesTotal);
      setTotalExpenses(expensesTotal);
      
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar contabilidad');
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600 bg-green-100';
      case 'expense':
        return 'text-red-600 bg-red-100';
      case 'asset':
        return 'text-blue-600 bg-blue-100';
      case 'liability':
        return 'text-orange-600 bg-orange-100';
      case 'equity':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'income':
        return 'Pago de Vendedor';
      case 'expense':
        return 'Inversión';
      case 'asset':
        return 'Activo';
      case 'liability':
        return 'Pasivo';
      case 'equity':
        return 'Patrimonio';
      default:
        return type;
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterBy === 'all') return matchesSearch;
    return matchesSearch && entry.type === filterBy;
  });

  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const balance = totalCredit - totalDebit;

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
          <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>
          <p className="text-gray-600">Inversiones y pagos de vendedores</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Asiento
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ventas a Vendedores</p>
                  <p className="text-2xl font-bold text-gray-900">${totalSales.toLocaleString()}</p>
                </div>
              </div>
            </div>
        
            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Gastos de Compras</p>
                  <p className="text-2xl font-bold text-gray-900">${totalExpenses.toLocaleString()}</p>
                </div>
              </div>
            </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Balance</p>
                  <p className={`text-2xl font-bold ${(totalSales - totalExpenses - totalShippingCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(totalSales - totalExpenses - totalShippingCost).toLocaleString()}
                  </p>
                </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Truck className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gastos de Paquetería</p>
              <p className="text-2xl font-bold text-gray-900">${totalShippingCost.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{shippingExpenses.length} paquetes</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calculator className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Asientos</p>
              <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ventas de Notas de Salida */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Ventas a Vendedores</h3>
            <p className="text-sm text-gray-600">Registro de ventas por notas de salida</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total vendido</p>
            <p className="text-2xl font-bold text-green-600">${totalSales.toLocaleString()}</p>
          </div>
        </div>
        
        {exitNoteSales.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas registradas</h3>
            <p className="mt-1 text-sm text-gray-500">Las ventas aparecerán aquí cuando se creen notas de salida.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exitNoteSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">#{sale.noteNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{sale.sellerName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">${sale.totalValue.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{new Date(sale.date).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.status === 'received' 
                          ? 'bg-green-100 text-green-800' 
                          : sale.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.status === 'received' ? 'Recibido' : 
                         sale.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gastos de Paquetería */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gastos de Paquetería</h3>
            <p className="text-sm text-gray-600">Registro de gastos por envíos y paquetería</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total gastado</p>
            <p className="text-2xl font-bold text-orange-600">${totalShippingCost.toLocaleString()}</p>
          </div>
        </div>
        
        {shippingExpenses.length === 0 ? (
          <div className="text-center py-8">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay gastos de paquetería</h3>
            <p className="mt-1 text-sm text-gray-500">Los gastos de envío aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinatario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shippingExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">#{expense.packageNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{expense.recipient}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{expense.trackingNumber || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">${expense.cost.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{new Date(expense.date).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        expense.status === 'delivered' 
                          ? 'bg-green-100 text-green-800' 
                          : expense.status === 'returned'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status === 'delivered' ? 'Entregado' : 
                         expense.status === 'returned' ? 'Devuelto' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar asientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos</option>
              <option value="income">Pagos de Vendedores</option>
              <option value="expense">Inversiones</option>
              <option value="asset">Activos</option>
              <option value="liability">Pasivos</option>
              <option value="equity">Patrimonio</option>
            </select>
            <button className="btn-secondary flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Accounting Entries Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Fecha</th>
                <th className="table-header">Descripción</th>
                <th className="table-header">Cuenta</th>
                <th className="table-header">Referencia</th>
                <th className="table-header">Débito</th>
                <th className="table-header">Crédito</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{entry.description}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{entry.account}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{entry.reference}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                      {getTypeText(entry.type)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Cuentas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Créditos:</span>
              <span className="text-sm font-medium text-green-600">${totalCredit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Débitos:</span>
              <span className="text-sm font-medium text-red-600">${totalDebit.toLocaleString()}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">Balance:</span>
                <span className={`text-sm font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(balance).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Tipo</h3>
          <div className="space-y-3">
            {['income', 'expense', 'asset', 'liability', 'equity'].map(type => {
              const count = entries.filter(e => e.type === type).length;
              const percentage = entries.length > 0 ? (count / entries.length) * 100 : 0;
              return (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{getTypeText(type)}:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getTypeColor(type).split(' ')[1]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="card text-center py-12">
          <Calculator className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay asientos contables</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron asientos con ese criterio.' : 'Comienza creando tu primer asiento contable.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Asiento Contable
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Accounting;
