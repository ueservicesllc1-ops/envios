import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Edit, Eye, Trash2, Mail, Phone, DollarSign, X } from 'lucide-react';
import { Seller } from '../types';
import { sellerService } from '../services/sellerService';
import toast from 'react-hot-toast';

const Sellers: React.FC = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    commission: 0,
    priceType: 'price1' as 'price1' | 'price2',
    isActive: true
  });

  // Array vacío para datos reales
  const sampleSellers: Seller[] = [];

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const sellersData = await sellerService.getAll();
      setSellers(sellersData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Error al cargar vendedores');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este vendedor?')) {
      try {
        await sellerService.delete(id);
        setSellers(sellers.filter(s => s.id !== id));
        toast.success('Vendedor eliminado correctamente');
      } catch (error) {
        console.error('Error deleting seller:', error);
        toast.error('Error al eliminar vendedor');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSeller) {
        await sellerService.update(editingSeller.id, formData);
        setSellers(sellers.map(s => s.id === editingSeller.id ? { ...s, ...formData } : s));
        toast.success('Vendedor actualizado correctamente');
      } else {
        const id = await sellerService.create(formData);
        const newSeller: Seller = {
          id,
          ...formData,
          createdAt: new Date()
        };
        setSellers([newSeller, ...sellers]);
        toast.success('Vendedor creado correctamente');
      }
      
      setShowModal(false);
      setEditingSeller(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        address: '',
        commission: 0,
        priceType: 'price1',
        isActive: true
      });
    } catch (error) {
      console.error('Error saving seller:', error);
      toast.error('Error al guardar vendedor');
    }
  };

  const handleEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      email: seller.email,
      phone: seller.phone,
      city: seller.city,
      address: seller.address,
      commission: seller.commission,
      priceType: seller.priceType || 'price1', // Valor por defecto si no existe
      isActive: seller.isActive
    });
    setShowModal(true);
  };

  const openModal = () => {
    setEditingSeller(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      city: '',
      address: '',
      commission: 0,
      priceType: 'price1',
      isActive: true
    });
    setShowModal(true);
  };

  const handleViewDetails = (sellerId: string) => {
    navigate(`/sellers/${sellerId}`);
  };

  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.phone.includes(searchTerm)
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Vendedores</h1>
          <p className="text-gray-600">Gestiona el equipo de ventas</p>
        </div>
        <button 
          onClick={openModal}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Vendedor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Vendedores</p>
              <p className="text-2xl font-bold text-gray-900">{sellers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {sellers.filter(s => s.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactivos</p>
              <p className="text-2xl font-bold text-gray-900">
                {sellers.filter(s => !s.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Comisión Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {sellers.length > 0 ? (sellers.reduce((sum, s) => sum + s.commission, 0) / sellers.length).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search - Hidden for now */}
      <div className="card hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar vendedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {filteredSellers.length} vendedores encontrados
            </span>
          </div>
        </div>
      </div>

      {/* Sellers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSellers.map((seller) => (
          <div key={seller.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-primary-600">
                    {seller.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {seller.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {seller.city} • Comisión: {seller.commission}% • {(seller.priceType || 'price1') === 'price1' ? 'Precio 1' : 'Precio 2'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEdit(seller)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                  <button
                    onClick={() => handleViewDetails(seller.id)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                <button
                  onClick={() => handleDelete(seller.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">{seller.email}</span>
              </div>
              
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">{seller.phone}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  seller.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {seller.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Miembro desde:</span>
                <span className="text-sm text-gray-900">
                  {new Date(seller.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSellers.length === 0 && (
        <div className="card text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay vendedores</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron vendedores con ese criterio.' : 'Comienza agregando tu primer vendedor.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={openModal}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Vendedor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar vendedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSeller ? 'Editar Vendedor' : 'Nuevo Vendedor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Carlos Mendoza"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="carlos@envios.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="+593 99 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input-field"
                  placeholder="Quito, Guayaquil, Cuenca..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  placeholder="Calle Principal 123, Sector Norte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comisión (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  placeholder="5.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Precio
                </label>
                <select
                  value={formData.priceType}
                  onChange={(e) => setFormData({ ...formData, priceType: e.target.value as 'price1' | 'price2' })}
                  className="input-field"
                >
                  <option value="price1">Precio 1 (Mayorista)</option>
                  <option value="price2">Precio 2 (Minorista)</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Vendedor activo
                </label>
              </div>

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
                  {editingSeller ? 'Actualizar' : 'Crear'} Vendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sellers;
