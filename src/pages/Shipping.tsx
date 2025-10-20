import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Eye, Edit, Trash2, MapPin, Clock, CheckCircle, XCircle, X, User, Phone, Package, DollarSign } from 'lucide-react';
import { Seller } from '../types';
import { sellerService } from '../services/sellerService';
import { shippingService, ShippingPackage } from '../services/shippingService';
import { syncService } from '../services/syncService';
import toast from 'react-hot-toast';


const Shipping: React.FC = () => {
  const [packages, setPackages] = useState<ShippingPackage[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ShippingPackage | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ShippingPackage | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [formData, setFormData] = useState({
    sellerId: '',
    address: '',
    city: '',
    phone: '',
    weight: 0,
    dimensions: 'Funda',
    notes: '',
    cost: 0
  });

  useEffect(() => {
    loadPackages();
    loadSellers();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const packagesData = await shippingService.getAll();
      setPackages(packagesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Error al cargar paquetes');
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const sellersData = await sellerService.getAll();
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Error al cargar vendedores');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in-transit':
        return 'En Tránsito';
      case 'delivered':
        return 'Entregado';
      case 'returned':
        return 'Devuelto';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'in-transit':
        return Truck;
      case 'delivered':
        return CheckCircle;
      case 'returned':
        return XCircle;
      default:
        return Clock;
    }
  };

  const generateTrackingNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `EC-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedSeller = sellers.find(s => s.id === formData.sellerId);
      if (!selectedSeller) {
        toast.error('Por favor selecciona un vendedor');
        return;
      }

      const packageData = {
        recipient: selectedSeller.name,
        address: formData.address,
        city: formData.city,
        phone: selectedSeller.phone,
        weight: formData.weight,
        dimensions: formData.dimensions,
        notes: formData.notes,
        cost: formData.cost
      };

      if (editingPackage) {
        // Editar envío existente
        await shippingService.update(editingPackage.id, packageData);
        setPackages(packages.map(p => 
          p.id === editingPackage.id 
            ? { ...p, ...packageData }
            : p
        ));
        toast.success('Envío actualizado correctamente');
      } else {
        // Crear nuevo envío
        const newPackageData = {
          ...packageData,
          status: 'pending' as const,
          shippingDate: new Date()
        };

        const packageId = await shippingService.create(newPackageData);
        const newPackage: ShippingPackage = {
          id: packageId,
          ...newPackageData
        };

        setPackages([newPackage, ...packages]);
        toast.success('Envío creado correctamente');
      }
      setShowModal(false);
      setEditingPackage(null);
      setFormData({
        sellerId: '',
        address: '',
        city: '',
        phone: '',
        weight: 0,
        dimensions: 'Funda',
        notes: '',
        cost: 0
      });
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error('Error al crear el envío');
    }
  };

  const openModal = () => {
    setEditingPackage(null);
    setFormData({
      sellerId: '',
      address: '',
      city: '',
      phone: '',
      weight: 0,
      dimensions: 'Funda',
      notes: '',
      cost: 0
    });
    setShowModal(true);
  };

  const openTrackingModal = (pkg: ShippingPackage) => {
    setSelectedPackage(pkg);
    setTrackingNumber('');
    setShowTrackingModal(true);
  };

  const handleAddTracking = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Por favor ingresa un número de seguimiento');
      return;
    }

    if (selectedPackage) {
      try {
        await shippingService.update(selectedPackage.id, {
          trackingNumber: trackingNumber.trim(),
          status: 'in-transit'
        });

        setPackages(packages.map(p => 
          p.id === selectedPackage.id 
            ? { ...p, trackingNumber: trackingNumber.trim(), status: 'in-transit' as const }
            : p
        ));
        toast.success('Número de seguimiento agregado');
        setShowTrackingModal(false);
        setSelectedPackage(null);
        setTrackingNumber('');
      } catch (error) {
        console.error('Error updating tracking:', error);
        toast.error('Error al agregar número de seguimiento');
      }
    }
  };

  const handleEdit = (pkg: ShippingPackage) => {
    setEditingPackage(pkg);
    setFormData({
      sellerId: sellers.find(s => s.name === pkg.recipient)?.id || '',
      address: pkg.address,
      city: pkg.city,
      phone: pkg.phone,
      weight: pkg.weight,
      dimensions: pkg.dimensions,
      notes: pkg.notes || '',
      cost: pkg.cost
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este envío?')) {
      try {
        await shippingService.delete(id);
        setPackages(packages.filter(p => p.id !== id));
        toast.success('Envío eliminado correctamente');
      } catch (error) {
        console.error('Error deleting package:', error);
        toast.error('Error al eliminar el envío');
      }
    }
  };

  const handleMarkAsDelivered = async (id: string) => {
    try {
      // Actualizar estado del paquete
      await shippingService.update(id, { 
        status: 'delivered',
        deliveredAt: new Date()
      });
      
      // Sincronizar con notas de salida y actualizar deuda del vendedor
      await syncService.syncShippingWithExitNotes(id, 'delivered');
      
      setPackages(packages.map(p => 
        p.id === id 
          ? { ...p, status: 'delivered' as const, deliveredAt: new Date() }
          : p
      ));
      
      toast.success('Paquete marcado como entregado y datos sincronizados');
    } catch (error) {
      console.error('Error marking as delivered:', error);
      toast.error('Error al marcar como entregado');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = (pkg.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         pkg.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterBy === 'all' || pkg.status === filterBy;
    
    return matchesSearch && matchesFilter;
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Paquetería</h1>
          <p className="text-gray-600">Gestión de envíos y paquetes</p>
        </div>
        <button 
          onClick={openModal}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Envío
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Envíos</p>
              <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">
                {packages.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entregados</p>
              <p className="text-2xl font-bold text-gray-900">
                {packages.filter(p => p.status === 'delivered').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En Tránsito</p>
              <p className="text-2xl font-bold text-gray-900">
                {packages.filter(p => p.status === 'in-transit').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar paquetes..."
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
              <option value="pending">Pendientes</option>
              <option value="in-transit">En Tránsito</option>
              <option value="delivered">Entregados</option>
              <option value="returned">Devueltos</option>
            </select>
            <span className="text-sm text-gray-600">
              {filteredPackages.length} paquetes
            </span>
          </div>
        </div>
      </div>

      {/* Packages Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Tracking</th>
                <th className="table-header">Destinatario</th>
                <th className="table-header">Ciudad</th>
                <th className="table-header">Peso</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Fecha Envío</th>
                <th className="table-header">Costo</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPackages.map((pkg) => {
                const StatusIcon = getStatusIcon(pkg.status);
                return (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      {pkg.trackingNumber ? (
                        <span className="text-sm font-medium text-gray-900">
                          {pkg.trackingNumber}
                        </span>
                      ) : (
                        <button
                          onClick={() => openTrackingModal(pkg)}
                          className="text-sm font-medium text-orange-600 hover:text-orange-700 underline cursor-pointer"
                        >
                          Pendiente
                        </button>
                      )}
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{pkg.recipient}</div>
                        <div className="text-sm text-gray-500">{pkg.phone}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.city}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.weight} kg</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.dimensions}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {getStatusText(pkg.status)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {new Date(pkg.shippingDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        ${pkg.cost.toLocaleString()}
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
                        {pkg.status !== 'delivered' && (
                          <button
                            onClick={() => handleMarkAsDelivered(pkg.id)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Marcar como entregado"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="p-1 text-gray-400 hover:text-yellow-600"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredPackages.length === 0 && (
        <div className="card text-center py-12">
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay paquetes</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron paquetes con ese criterio.' : 'Comienza creando tu primer envío.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={openModal}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Envío
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar envío */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPackage ? 'Editar Envío' : 'Nuevo Envío'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información del destinatario */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Información del Destinatario
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendedor *
                    </label>
                    <select
                      required
                      value={formData.sellerId}
                      onChange={(e) => {
                        const selectedSeller = sellers.find(s => s.id === e.target.value);
                        setFormData({
                          ...formData, 
                          sellerId: e.target.value,
                          phone: selectedSeller?.phone || '',
                          city: selectedSeller?.city || '',
                          address: selectedSeller?.address || ''
                        });
                      }}
                      className="input-field"
                    >
                      <option value="">Seleccionar vendedor</option>
                      {sellers.map(seller => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name} - {seller.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      className="input-field bg-gray-100"
                      disabled
                      placeholder="Se llena automáticamente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      className="input-field bg-gray-100"
                      disabled
                      placeholder="Se llena automáticamente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      className="input-field bg-gray-100"
                      disabled
                      placeholder="Se llena automáticamente"
                    />
                  </div>
                </div>
              </div>

              {/* Información del paquete */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Información del Paquete
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})}
                      className="input-field"
                      placeholder="1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Paquete
                    </label>
                    <select
                      value={formData.dimensions}
                      onChange={(e) => setFormData({...formData, dimensions: e.target.value})}
                      className="input-field"
                    >
                      <option value="Funda">Funda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo de Envío *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                      className="input-field"
                      placeholder="5.00"
                    />
                  </div>
                </div>
              </div>

              {/* Notas adicionales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Instrucciones especiales, horarios de entrega, etc."
                />
              </div>

              {/* Resumen del tracking */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-2 flex items-center">
                  <Truck className="h-4 w-4 mr-2" />
                  Número de Seguimiento
                </h4>
                <p className="text-sm text-gray-600">
                  Se agregará cuando la empresa de envíos lo proporcione por correo
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  El envío aparecerá como "Pendiente" hasta que se agregue el número
                </p>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      {editingPackage ? 'Actualizar Envío' : 'Crear Envío'}
                    </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pequeño para agregar número de seguimiento */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Agregar Número de Seguimiento
              </h3>
              <button
                onClick={() => setShowTrackingModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedPackage && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Destinatario:</strong> {selectedPackage.recipient}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Ciudad:</strong> {selectedPackage.city}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Peso:</strong> {selectedPackage.weight} kg
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Seguimiento *
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="input-field"
                placeholder="Ej: EC123456789PE"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTracking}
                className="btn-primary"
              >
                Agregar Seguimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipping;
