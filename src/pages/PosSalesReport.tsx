import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  RotateCcw,
  CheckCircle,
  XCircle,
  Download,
  Mail,
  Eye,
  RefreshCw,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingDown,
  AlertTriangle,
  ArrowLeft,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  MapPin,
  Clock,
  User,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { posService } from '../services/posService';
import { PointOfSale, POSItem } from '../types';
import { generatePOSReceipt } from '../utils/pdfGenerator';
import { getApiUrl } from '../config/api.config';
import toast from 'react-hot-toast';

export const PosSalesReport: React.FC = () => {
  const navigate = useNavigate();

  const [sales, setSales] = useState<PointOfSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Modal para revertir venta
  const [saleToRevert, setSaleToRevert] = useState<PointOfSale | null>(null);
  const [revertReason, setRevertReason] = useState('Devolución de cliente');
  const [reverting, setReverting] = useState(false);

  // Modal para ver detalle completo
  const [saleDetail, setSaleDetail] = useState<PointOfSale | null>(null);

  // Estado de reenvío de correo
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await posService.getAll();
      setSales(data);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      toast.error('Error al cargar reporte de ventas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de ventas
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    return sales.filter(sale => {
      // Filtro de estado
      if (statusFilter !== 'all' && sale.status !== statusFilter) {
        return false;
      }

      // Filtro de período
      if (periodFilter !== 'all') {
        const saleTime = new Date(sale.date || sale.createdAt).getTime();
        if (periodFilter === 'today' && saleTime < todayStart) return false;
        if (periodFilter === '7days' && saleTime < sevenDaysAgo) return false;
        if (periodFilter === '30days' && saleTime < thirtyDaysAgo) return false;
      }

      // Filtro de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const saleNum = (sale.saleNumber || '').toLowerCase();
        const clientName = (sale.customerName || '').toLowerCase();
        const clientEmail = (sale.customerEmail || '').toLowerCase();
        const clientPhone = (sale.customerPhone || '').toLowerCase();
        const clientCedula = ((sale as any).customerCedula || '').toLowerCase();
        const seller = (sale.createdBy || '').toLowerCase();
        const itemsMatch = sale.items?.some(it =>
          (it.product?.name || '').toLowerCase().includes(term) ||
          (it.product?.brand || '').toLowerCase().includes(term)
        );

        return (
          saleNum.includes(term) ||
          clientName.includes(term) ||
          clientEmail.includes(term) ||
          clientPhone.includes(term) ||
          clientCedula.includes(term) ||
          seller.includes(term) ||
          itemsMatch
        );
      }

      return true;
    });
  }, [sales, statusFilter, periodFilter, searchTerm]);

  // Cálculos de métricas
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let completedCount = 0;
    let revertedCount = 0;
    let revertedAmount = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    let cardTotal = 0;
    let totalPerfumesSold = 0;

    for (const sale of filteredSales) {
      if (sale.status === 'completed') {
        totalRevenue += sale.total || 0;
        completedCount++;
        if (sale.paymentMethod === 'cash') cashTotal += sale.total || 0;
        else if (sale.paymentMethod === 'transfer') transferTotal += sale.total || 0;
        else if (sale.paymentMethod === 'card') cardTotal += sale.total || 0;

        for (const it of sale.items || []) {
          totalPerfumesSold += it.quantity || 1;
        }
      } else if (sale.status === 'cancelled') {
        revertedCount++;
        revertedAmount += sale.total || 0;
      }
    }

    return {
      totalRevenue,
      completedCount,
      revertedCount,
      revertedAmount,
      cashTotal,
      transferTotal,
      cardTotal,
      totalPerfumesSold
    };
  }, [filteredSales]);

  // Ejecutar reversión de venta
  const handleConfirmRevert = async () => {
    if (!saleToRevert) return;
    try {
      setReverting(true);
      await posService.cancelSale(
        saleToRevert.id,
        revertReason.trim() || 'Devolución / Reversión desde panel de administración',
        'Admin'
      );
      setSaleToRevert(null);
      setRevertReason('Devolución de cliente');
      await loadSales();
    } catch (err: any) {
      console.error(err);
    } finally {
      setReverting(false);
    }
  };

  // Reenviar nota de venta por correo
  const handleResendReceiptEmail = async (sale: PointOfSale) => {
    if (!sale.customerEmail) {
      toast.error('Esta venta no tiene un correo electrónico registrado');
      return;
    }

    try {
      setResendingEmailId(sale.id);
      const emailPayload = {
        toEmail: sale.customerEmail.trim().toLowerCase(),
        customerName: sale.customerName?.trim() || 'Cliente General',
        customerCedula: (sale as any).customerCedula || '',
        saleNumber: sale.saleNumber,
        date: new Date(sale.date || sale.createdAt).toISOString(),
        items: (sale.items || []).map(it => ({
          name: it.product?.brand ? `${it.product.brand} - ${it.product.name}` : (it.product?.name || 'Perfume'),
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice
        })),
        subtotal: sale.subtotal,
        total: sale.total,
        paymentMethod: sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'transfer' ? 'Transferencia' : 'Tarjeta',
        staffName: sale.createdBy || 'Asesor Tienda',
        location: (sale as any).location || 'Tienda Local Falconi'
      };

      const response = await fetch(getApiUrl('/api/pos/send-receipt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });

      const resData = await response.json();
      if (response.ok && resData.success !== false) {
        toast.success(`📧 Nota de venta reenviada a ${sale.customerEmail}`);
      } else {
        toast.error(resData.error || resData.message || 'Error reenviando correo');
      }
    } catch (error: any) {
      console.error('Error al reenviar comprobante:', error);
      toast.error('Error al conectar con servidor de correos');
    } finally {
      setResendingEmailId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reporte de Ventas POS</h1>
                <p className="text-sm text-gray-500">Historial de ventas de Tienda Local y reversión automática al inventario</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/posmobil')}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm"
            >
              <Smartphone className="w-4 h-4" />
              <span>Abrir POS Móvil</span>
            </button>
            <button
              onClick={loadSales}
              disabled={loading}
              className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 text-sm"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Ventas Totales</p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.completedCount} nota(s) completadas</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-blue-600 tracking-wider">Perfumes Vendidos</p>
              <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.totalPerfumesSold}</p>
              <p className="text-xs text-gray-400 mt-1">unidades en Tienda Local</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-rose-600 tracking-wider">Revertidas / Devolución</p>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">${stats.revertedAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.revertedCount} venta(s) devueltas</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <RotateCcw className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
            <p className="text-xs font-bold uppercase text-purple-600 tracking-wider mb-2">Métodos de Cobro</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5 text-emerald-500" /> Efectivo:</span>
                <span className="font-bold text-gray-900">${stats.cashTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-blue-500" /> Transf.:</span>
                <span className="font-bold text-gray-900">${stats.transferTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Tarjeta:</span>
                <span className="font-bold text-gray-900">${stats.cardTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Nota, Cliente, Cédula, Producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Todas ({sales.length})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Completadas
              </button>
              <button
                onClick={() => setStatusFilter('cancelled')}
                className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'cancelled' ? 'bg-rose-600 text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Revertidas
              </button>
            </div>

            {/* Period Filter */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setPeriodFilter('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${periodFilter === 'today' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Hoy
              </button>
              <button
                onClick={() => setPeriodFilter('7days')}
                className={`px-3 py-1.5 rounded-lg transition-all ${periodFilter === '7days' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                7 días
              </button>
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${periodFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Todo
              </button>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-500 font-medium">Cargando reporte de ventas...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-gray-700 font-bold">No se encontraron ventas</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                No hay ventas que coincidan con los filtros seleccionados o aún no se han registrado notas de venta en el POS.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5">Nota de Venta</th>
                    <th className="px-5 py-3.5">Fecha y Hora</th>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Perfumes Vendidos</th>
                    <th className="px-5 py-3.5">Total & Pago</th>
                    <th className="px-5 py-3.5">Vendedor</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredSales.map((sale) => {
                    const isReverted = sale.status === 'cancelled';
                    const saleDate = sale.date ? new Date(sale.date) : new Date(sale.createdAt);

                    return (
                      <tr key={sale.id} className={`hover:bg-gray-50/70 transition-colors ${isReverted ? 'bg-rose-50/20' : ''}`}>
                        {/* Nota Nº & Ubicación */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-indigo-600 font-mono text-sm">{sale.saleNumber}</span>
                            {(sale as any).source === 'pos-mobil' && (
                              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Móvil</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 flex items-center mt-0.5">
                            <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                            {(sale as any).location || 'Tienda Local'}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-semibold text-gray-800 text-xs">{saleDate.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          <p className="text-[11px] text-gray-400 flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1 text-gray-400" />
                            {saleDate.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        {/* Cliente */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900 text-sm">{sale.customerName || 'Cliente General'}</p>
                          {sale.customerEmail && (
                            <p className="text-xs text-indigo-600 truncate max-w-[180px]">{sale.customerEmail}</p>
                          )}
                          {(sale as any).customerCedula && (
                            <p className="text-[11px] text-gray-400">C.I: {(sale as any).customerCedula}</p>
                          )}
                          {sale.customerPhone && (
                            <p className="text-[11px] text-gray-400">Tel: {sale.customerPhone}</p>
                          )}
                        </td>

                        {/* Perfumes Vendidos */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="space-y-1">
                            {sale.items?.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="text-xs flex items-center justify-between gap-2">
                                <span className="font-medium text-gray-800 truncate">
                                  {it.quantity}x {it.product?.name || 'Perfume'}
                                </span>
                                <span className="font-mono text-gray-600 font-semibold shrink-0">
                                  ${it.totalPrice.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {(sale.items?.length || 0) > 2 && (
                              <p className="text-[10px] text-indigo-600 font-semibold cursor-pointer" onClick={() => setSaleDetail(sale)}>
                                +{(sale.items?.length || 0) - 2} perfume(s) más...
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Total & Pago */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-black text-gray-900 text-base">${sale.total.toFixed(2)}</p>
                          <span className="inline-flex items-center text-[11px] text-gray-500 capitalize">
                            {sale.paymentMethod === 'cash' ? (
                              <><Banknote className="w-3 h-3 mr-1 text-emerald-600" /> Efectivo</>
                            ) : sale.paymentMethod === 'transfer' ? (
                              <><Smartphone className="w-3 h-3 mr-1 text-blue-600" /> Transferencia</>
                            ) : (
                              <><CreditCard className="w-3 h-3 mr-1 text-purple-600" /> Tarjeta</>
                            )}
                          </span>
                        </td>

                        {/* Vendedor */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 font-medium text-xs px-2 py-1 rounded-lg">
                            <User className="w-3 h-3" />
                            {sale.createdBy || 'Asesor'}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isReverted ? (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Revertida / Devolución
                              </span>
                              {(sale as any).revertedAt && (
                                <span className="text-[10px] text-rose-600 mt-0.5">
                                  Devuelto al inventario
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Completada
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Ver detalle */}
                            <button
                              onClick={() => setSaleDetail(sale)}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Ver Detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Descargar PDF */}
                            <button
                              onClick={() => generatePOSReceipt(sale)}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Descargar Comprobante PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Reenviar Correo */}
                            {sale.customerEmail && (
                              <button
                                onClick={() => handleResendReceiptEmail(sale)}
                                disabled={resendingEmailId === sale.id}
                                className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reenviar Nota de Venta por Correo"
                              >
                                <Mail className={`w-4 h-4 ${resendingEmailId === sale.id ? 'animate-bounce' : ''}`} />
                              </button>
                            )}

                            {/* Revertir Venta (Solo si está completada) */}
                            {!isReverted && (
                              <button
                                onClick={() => {
                                  setSaleToRevert(sale);
                                  setRevertReason('Devolución de cliente');
                                }}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors font-medium text-xs flex items-center gap-1"
                                title="Revertir Venta / Devolver productos al inventario"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span className="hidden xl:inline">Revertir</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── MODAL REVERTIR VENTA / DEVOLUCIÓN ──────────────────────────────────── */}
      {saleToRevert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-rose-100">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <RotateCcw className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">Revertir Venta / Devolución</h3>
                    <p className="text-xs text-rose-100">Nota Nº {saleToRevert.saleNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSaleToRevert(null)}
                  disabled={reverting}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-rose-900">¿Deseas revertir esta venta?</p>
                  <p className="mt-1">
                    Esta acción marcará la nota como <strong>Revertida / Devolución</strong> y reingresará automáticamente las unidades vendidas al stock de <strong>{(saleToRevert as any).location || 'Tienda Local'}</strong>.
                  </p>
                </div>
              </div>

              {/* Perfumes que volverán al inventario */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Productos a devolver al inventario:</p>
                <div className="bg-gray-50 rounded-xl p-3 max-h-44 overflow-y-auto space-y-2 border border-gray-200">
                  {saleToRevert.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800">
                        +{item.quantity}x {item.product?.name || 'Perfume'}
                      </span>
                      <span className="text-gray-500 font-mono font-bold">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-700 mt-2 px-1">
                  <span>Total de la venta revertida:</span>
                  <span className="text-base text-gray-900 font-black">${saleToRevert.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Motivo de la reversión */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Motivo de la reversión / devolución:
                </label>
                <input
                  type="text"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="Ej: Devolución de cliente, Error en cobro, Prueba de venta..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleToRevert(null)}
                  disabled={reverting}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevert}
                  disabled={reverting}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
                >
                  {reverting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Revisando y devolviendo...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Confirmar Reversión</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE COMPLETO DE VENTA ───────────────────────────────────── */}
      {saleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Detalle de Venta</span>
                <h3 className="font-black text-2xl mt-0.5">{saleDetail.saleNumber}</h3>
                <p className="text-xs text-indigo-100 mt-1">
                  {new Date(saleDetail.date || saleDetail.createdAt).toLocaleString('es-EC')}
                </p>
              </div>
              <button onClick={() => setSaleDetail(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Info Cliente */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-1.5 text-xs">
                <p className="font-bold text-gray-900 text-sm">{saleDetail.customerName || 'Cliente General'}</p>
                {saleDetail.customerEmail && <p className="text-indigo-600 font-medium">{saleDetail.customerEmail}</p>}
                {(saleDetail as any).customerCedula && <p className="text-gray-600">C.I: {(saleDetail as any).customerCedula}</p>}
                {saleDetail.customerPhone && <p className="text-gray-600">Teléfono: {saleDetail.customerPhone}</p>}
                <div className="pt-2 border-t border-gray-200 flex justify-between text-gray-500">
                  <span>Atendido por: <strong className="text-gray-800">{saleDetail.createdBy || 'Asesor'}</strong></span>
                  <span>Ubicación: <strong className="text-gray-800">{(saleDetail as any).location || 'Tienda Local'}</strong></span>
                </div>
              </div>

              {/* Lista de Items */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Desglose de Perfumes</p>
                <div className="space-y-2">
                  {saleDetail.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{item.product?.name || 'Perfume'}</p>
                        {item.product?.brand && <p className="text-[11px] text-gray-400">{item.product.brand}</p>}
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {item.quantity} x ${item.unitPrice.toFixed(2)}
                          {item.product?.salePrice1 && item.product.salePrice1 > item.unitPrice && (
                            <span className="line-through text-gray-400 ml-1.5">
                              ${item.product.salePrice1.toFixed(2)}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-mono font-black text-gray-900 text-sm">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">${saleDetail.subtotal.toFixed(2)}</span>
                </div>
                {saleDetail.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Descuento aplicado:</span>
                    <span className="font-mono">-${saleDetail.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 text-base font-black pt-2 border-t border-gray-200">
                  <span>Total Cobrado:</span>
                  <span className="font-mono">${saleDetail.total.toFixed(2)}</span>
                </div>
                <div className="pt-2 text-[11px] text-gray-500 flex justify-between">
                  <span>Método de pago: <strong className="text-gray-800 capitalize">{saleDetail.paymentMethod}</strong></span>
                  {saleDetail.paymentMethod === 'cash' && saleDetail.cashReceived && (
                    <span>Recibido: ${saleDetail.cashReceived.toFixed(2)} | Vuelto: ${(saleDetail.change || 0).toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Info de reversión si está cancelada */}
              {saleDetail.status === 'cancelled' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 space-y-1">
                  <p className="font-bold text-rose-900 flex items-center">
                    <XCircle className="w-4 h-4 mr-1.5 text-rose-600" />
                    Venta Revertida / Devolución Registrada
                  </p>
                  {(saleDetail as any).revertedAt && (
                    <p className="text-rose-700">
                      Fecha: {new Date((saleDetail as any).revertedAt.toDate ? (saleDetail as any).revertedAt.toDate() : (saleDetail as any).revertedAt).toLocaleString('es-EC')}
                    </p>
                  )}
                  {(saleDetail as any).revertReason && (
                    <p className="text-rose-700">Motivo: {(saleDetail as any).revertReason}</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3 shrink-0">
              <button
                onClick={() => generatePOSReceipt(saleDetail)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 text-xs shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => setSaleDetail(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PosSalesReport;
