import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock,
  User,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { paymentNoteService, PaymentNote, PaymentNoteItem } from '../services/paymentNoteService';
import { sellerService } from '../services/sellerService';
import toast from 'react-hot-toast';

interface Seller {
  id: string;
  name: string;
  email: string;
}

const PaymentNotes: React.FC = () => {
  const [paymentNotes, setPaymentNotes] = useState<PaymentNote[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<PaymentNote | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notesData, sellersData] = await Promise.all([
        paymentNoteService.getAll(),
        sellerService.getAll()
      ]);
      
      // Las notas ya tienen sellerName, no necesitamos enriquecerlas
      const enrichedNotes = notesData;
      
      setPaymentNotes(enrichedNotes);
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading payment notes:', error);
      toast.error('Error al cargar las notas de pago');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (noteId: string) => {
    try {
      // Actualizar el estado de la nota de pago
      await paymentNoteService.updateStatus(noteId, 'approved', 'Administrador');
      
      // Recargar datos para actualizar la deuda total automáticamente
      await loadData();
      
      toast.success('Nota de pago aprobada y deuda actualizada');
      setShowDetailsModal(false);
      
      // Opcional: Mostrar notificación de que la deuda total se actualizará
      setTimeout(() => {
        toast.success('La deuda total de vendedores se ha actualizado automáticamente');
      }, 1000);
      
    } catch (error) {
      console.error('Error approving payment note:', error);
      toast.error('Error al aprobar la nota de pago');
    }
  };

  const handleReject = async (noteId: string) => {
    try {
      await paymentNoteService.updateStatus(noteId, 'rejected');
      toast.success('Nota de pago rechazada');
      await loadData();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error rejecting payment note:', error);
      toast.error('Error al rechazar la nota de pago');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredNotes = paymentNotes.filter(note => 
    filterStatus === 'all' || note.status === filterStatus
  );

  const stats = {
    total: paymentNotes.length,
    pending: paymentNotes.filter(n => n.status === 'pending').length,
    approved: paymentNotes.filter(n => n.status === 'approved').length,
    rejected: paymentNotes.filter(n => n.status === 'rejected').length,
    totalAmount: paymentNotes.reduce((sum, note) => sum + note.totalAmount, 0),
    pendingAmount: paymentNotes.filter(n => n.status === 'pending').reduce((sum, note) => sum + note.totalAmount, 0)
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Notas de Pago</h1>
          <p className="text-gray-600">Gestiona las notas de pago de los vendedores</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Notas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aprobadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rechazadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monto Pendiente</p>
              <p className="text-2xl font-bold text-gray-900">${stats.pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filterStatus === 'all'
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Todas ({stats.total})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filterStatus === 'pending'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Pendientes ({stats.pending})
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filterStatus === 'approved'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Aprobadas ({stats.approved})
        </button>
        <button
          onClick={() => setFilterStatus('rejected')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filterStatus === 'rejected'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Rechazadas ({stats.rejected})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay notas de pago</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'all' 
                ? 'Los vendedores aún no han generado notas de pago.'
                : `No hay notas de pago con estado "${getStatusText(filterStatus)}".`
              }
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{note.number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{note.sellerName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${note.totalAmount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                      {getStatusIcon(note.status)}
                      <span className="ml-1">{getStatusText(note.status)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedNote(note);
                        setShowDetailsModal(true);
                      }}
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
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de Nota de Pago #{selectedNote.number}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Información General</h4>
                <div className="space-y-2">
                  <p><span className="font-medium">Número:</span> {selectedNote.number}</p>
                  <p><span className="font-medium">Vendedor:</span> {selectedNote.sellerName}</p>
                  <p><span className="font-medium">Monto Total:</span> ${selectedNote.totalAmount.toLocaleString()}</p>
                  <p><span className="font-medium">Fecha de Creación:</span> {new Date(selectedNote.createdAt).toLocaleDateString()}</p>
                  <p><span className="font-medium">Estado:</span> 
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedNote.status)}`}>
                      {getStatusIcon(selectedNote.status)}
                      <span className="ml-1">{getStatusText(selectedNote.status)}</span>
                    </span>
                  </p>
                </div>
              </div>
              
              {selectedNote.approvedAt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Información de Aprobación</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Fecha de Aprobación:</span> {new Date(selectedNote.approvedAt).toLocaleDateString()}</p>
                    {selectedNote.approvedBy && (
                      <p><span className="font-medium">Aprobado por:</span> {selectedNote.approvedBy}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Productos Incluidos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedNote.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(item.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(item.totalPrice || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedNote.notes && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Notas</h4>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedNote.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {selectedNote.status === 'pending' && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleReject(selectedNote.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => handleApprove(selectedNote.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Aprobar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentNotes;
