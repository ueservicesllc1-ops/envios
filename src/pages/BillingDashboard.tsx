import React, { useState, useEffect } from 'react';
import {
    Receipt,
    Users,
    Package,
    BarChart3,
    FileText,
    ShoppingCart,
    DollarSign,
    TrendingUp,
    Calendar,
    CreditCard,
    Phone,
    Download,
    Trash2
} from 'lucide-react';
import POSModal from '../components/POS/POSModal';
import EditSaleModal from '../components/POS/EditSaleModal';
import { posService } from '../services/posService';
import { PointOfSale } from '../types';
import { generatePOSReceipt } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

const BillingDashboard: React.FC = () => {
    const [showPOS, setShowPOS] = useState(false);
    const [selectedView, setSelectedView] = useState<string>('dashboard');
    const [sales, setSales] = useState<PointOfSale[]>([]);
    const [loadingSales, setLoadingSales] = useState(false);

    // Edit Modal State
    const [editingSale, setEditingSale] = useState<PointOfSale | null>(null);

    const [dailyStats, setDailyStats] = useState({
        totalRevenue: 0,
        totalSales: 0,
        totalCustomers: 0,
        totalCash: 0,
        totalCard: 0,
        totalTransfer: 0
    });

    useEffect(() => {
        loadDailyStats();
    }, []);

    useEffect(() => {
        if (selectedView === 'receipts') {
            loadSales();
        }
    }, [selectedView]);

    const loadDailyStats = async () => {
        try {
            const report = await posService.getDailySalesReport();
            // Calcular clientes únicos (simple aproximación por nombre)
            const uniqueCustomers = new Set(report.sales.map(s => s.customerName || 'Cliente General')).size;

            setDailyStats({
                totalRevenue: report.totalRevenue,
                totalSales: report.totalSales,
                totalCustomers: uniqueCustomers,
                totalCash: report.totalCash,
                totalCard: report.totalCard,
                totalTransfer: report.totalTransfer
            });
        } catch (error) {
            console.error('Error loading daily stats:', error);
        }
    };

    const loadSales = async () => {
        try {
            setLoadingSales(true);
            const data = await posService.getAll();
            setSales(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar ventas');
        } finally {
            setLoadingSales(false);
        }
    };

    const handleDeleteSale = async (sale: PointOfSale) => {
        if (!window.confirm(`¿Estás seguro de cancelar la venta ${sale.saleNumber}? Esto devolverá los productos al inventario.`)) {
            return;
        }

        try {
            await posService.cancelSale(sale.id, 'Cancelado por usuario admin desde panel');
            toast.success('Venta cancelada exitosamente');
            loadSales(); // Refresh list
            loadDailyStats(); // Refresh stats
        } catch (error) {
            console.error(error);
        }
    };

    const handleMenuClick = (action: string) => {
        setSelectedView(action);
    };

    const menuItems = [
        {
            title: 'Clientes',
            description: 'Gestión de clientes del POS',
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            action: 'customers'
        },
        {
            title: 'Productos POS',
            description: 'Catálogo de productos para venta',
            icon: Package,
            color: 'from-purple-500 to-pink-500',
            action: 'products'
        },
        {
            title: 'Reportes de Ventas',
            description: 'Análisis y estadísticas',
            icon: BarChart3,
            color: 'from-orange-500 to-red-500',
            action: 'reports'
        },
        {
            title: 'Notas de Venta POS',
            description: 'Historial de facturas y recibos',
            icon: FileText,
            color: 'from-green-500 to-emerald-500',
            action: 'receipts'
        }
    ];

    const stats = [
        {
            label: 'Ventas Hoy',
            value: `$${dailyStats.totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-green-600 bg-green-100'
        },
        {
            label: 'Transacciones',
            value: dailyStats.totalSales.toString(),
            icon: ShoppingCart,
            color: 'text-blue-600 bg-blue-100'
        },
        {
            label: 'Clientes',
            value: dailyStats.totalCustomers.toString(),
            icon: Users,
            color: 'text-purple-600 bg-purple-100'
        },
        {
            label: 'Ticket Promedio',
            value: `$${dailyStats.totalSales > 0 ? (dailyStats.totalRevenue / dailyStats.totalSales).toFixed(2) : '0.00'}`,
            icon: TrendingUp,
            color: 'text-orange-600 bg-orange-100'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <img src="/logo-compras-express.png" alt="Compras Express" className="h-12 object-contain" />
                                <span className="text-4xl font-bold text-gray-900">- POS</span>
                            </div>
                            <p className="text-gray-600 flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {new Date().toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                        {selectedView !== 'dashboard' && (
                            <button
                                onClick={() => setSelectedView('dashboard')}
                                className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-50 shadow-md transition-all"
                            >
                                ← Volver
                            </button>
                        )}
                    </div>
                </div>

                {selectedView === 'dashboard' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {stats.map((stat, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                                        </div>
                                        <div className={`p-4 rounded-xl ${stat.color}`}>
                                            <stat.icon className="h-8 w-8" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* POS Button - Main Action */}
                        <div className="mb-8">
                            <button
                                onClick={() => setShowPOS(true)}
                                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
                            >
                                <div className="relative px-8 py-12">
                                    <div className="flex items-center justify-center space-x-6">
                                        <div className="bg-white/20 backdrop-blur-sm p-6 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                            <Receipt className="h-16 w-16" />
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-4xl font-bold mb-2">Abrir Punto de Venta</h2>
                                            <p className="text-white/90 text-lg">Iniciar nueva transacción - POS</p>
                                        </div>
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                </div>
                            </button>
                        </div>

                        {/* Menu Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {menuItems.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleMenuClick(item.action)}
                                    className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden group"
                                >
                                    <div className="p-8">
                                        <div className={`w-16 h-16 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                            <item.icon className="h-8 w-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                                        <p className="text-gray-600 text-sm">{item.description}</p>
                                    </div>

                                    <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                                </button>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left">
                                    <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                                        <Receipt className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Última Venta</p>
                                        <p className="text-sm text-gray-500">Ver detalles</p>
                                    </div>
                                </button>

                                <button className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left">
                                    <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Caja del Día</p>
                                        <p className="text-sm text-gray-500">$0.00</p>
                                    </div>
                                </button>

                                <button className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left">
                                    <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Clientes Hoy</p>
                                        <p className="text-sm text-gray-500">0 clientes</p>
                                    </div>
                                </button>

                                <button className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left">
                                    <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                                        <BarChart3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Reportes</p>
                                        <p className="text-sm text-gray-500">Ver más</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {selectedView === 'customers' && (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                            <Users className="h-7 w-7 mr-3 text-blue-600" />
                            Gestión de Clientes
                        </h2>
                        <p className="text-gray-600 mb-6">Lista de clientes registrados en el sistema POS</p>
                        <div className="text-center py-12 text-gray-400">
                            <Users className="h-16 w-16 mx-auto mb-4" />
                            <p>Funcionalidad en desarrollo</p>
                        </div>
                    </div>
                )}

                {selectedView === 'products' && (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                            <Package className="h-7 w-7 mr-3 text-purple-600" />
                            Productos POS
                        </h2>
                        <p className="text-gray-600 mb-6">Catálogo de productos disponibles para el punto de venta</p>
                        <div className="text-center py-12 text-gray-400">
                            <Package className="h-16 w-16 mx-auto mb-4" />
                            <p>Funcionalidad en desarrollo</p>
                        </div>
                    </div>
                )}

                {selectedView === 'reports' && (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                    <BarChart3 className="h-7 w-7 mr-3 text-orange-600" />
                                    Reporte Diario
                                </h2>
                                <p className="text-gray-600">Resumen de movimientos de hoy</p>
                            </div>
                            <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-semibold">
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>

                        {/* Top Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
                                <p className="text-sm font-semibold text-green-600 mb-1">Total Ingresos</p>
                                <p className="text-3xl font-bold text-green-900">${dailyStats.totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                                <p className="text-sm font-semibold text-blue-600 mb-1">Total Ventas</p>
                                <p className="text-3xl font-bold text-blue-900">{dailyStats.totalSales}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 p-6 rounded-2xl border border-purple-100">
                                <p className="text-sm font-semibold text-purple-600 mb-1">Ticket Promedio</p>
                                <p className="text-3xl font-bold text-purple-900">
                                    ${dailyStats.totalSales > 0 ? (dailyStats.totalRevenue / dailyStats.totalSales).toFixed(2) : '0.00'}
                                </p>
                            </div>
                        </div>

                        {/* Métodos de Pago */}
                        <div className="bg-gray-50 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Desglose por Método de Pago</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                            <DollarSign className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Efectivo</p>
                                            <p className="font-bold text-gray-900">${dailyStats.totalCash.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <CreditCard className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Tarjeta</p>
                                            <p className="font-bold text-gray-900">${dailyStats.totalCard.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Transferencia</p>
                                            <p className="font-bold text-gray-900">${dailyStats.totalTransfer.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedView === 'receipts' && (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                    <FileText className="h-7 w-7 mr-3 text-green-600" />
                                    Notas de Venta POS
                                </h2>
                                <p className="text-gray-600">Historial completo de facturas y recibos emitidos</p>
                            </div>
                            <button
                                onClick={() => loadSales()}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>

                        {loadingSales ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p className="mt-4 text-gray-500">Cargando recibos...</p>
                            </div>
                        ) : sales.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <FileText className="h-16 w-16 mx-auto mb-4" />
                                <p>No hay ventas registradas aún</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota Nº</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sales.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {sale.date ? new Date(sale.date).toLocaleDateString() : '-'} <br />
                                                    <span className="text-xs text-gray-500">
                                                        {sale.date ? new Date(sale.date).toLocaleTimeString() : ''}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                    {sale.saleNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {sale.customerName || 'Cliente General'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                    ${sale.total.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                    {sale.paymentMethod === 'mixed' ? 'Mixto' :
                                                        sale.paymentMethod === 'card' ? 'Tarjeta' :
                                                            sale.paymentMethod === 'transfer' ? 'Transferencia' : 'Efectivo'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {sale.status === 'completed' ? 'Completada' : 'Cancelada'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => generatePOSReceipt(sale)}
                                                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                                                            title="Descargar Recibo"
                                                        >
                                                            <Download className="h-5 w-5" />
                                                        </button>
                                                        {sale.status === 'completed' && (
                                                            <>
                                                                <button
                                                                    onClick={() => setEditingSale(sale)}
                                                                    className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                                                    title="Editar Datos"
                                                                >
                                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSale(sale)}
                                                                    className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                                    title="Cancelar Venta"
                                                                >
                                                                    <Trash2 className="h-5 w-5" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* POS Modal */}
            {showPOS && <POSModal onClose={() => {
                setShowPOS(false);
                loadDailyStats(); // Recargar estadísticas al cerrar el POS
            }} />}

            {/* Edit Sale Modal */}
            {editingSale && (
                <EditSaleModal
                    sale={editingSale}
                    onClose={() => setEditingSale(null)}
                    onUpdate={() => {
                        loadSales();
                        loadDailyStats();
                    }}
                />
            )}
        </div>
    );
};

export default BillingDashboard;
