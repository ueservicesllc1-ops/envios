import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProductsBySeller, deleteProduct, updateProduct } from '../../services/productService';
import { Package, Search, Filter, Plus, Edit2, Trash2, Archive, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function SellerProducts() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user?.uid) {
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    setLoading(true);
    const data = await getProductsBySeller(user.uid);
    setProducts(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      try {
        await deleteProduct(id);
        addToast('Producto eliminado', 'success');
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        addToast('Error eliminando producto', 'error');
      }
    }
  };

  const handleArchive = async (id, currentStatus) => {
    const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
    try {
      await updateProduct(id, { status: newStatus });
      addToast(`Producto ${newStatus === 'active' ? 'activado' : 'archivado'}`, 'success');
      setProducts(products.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (error) {
      addToast('Error cambiando estado', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/seller')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-xl text-gray-900 leading-tight">Mis Productos</h1>
            <p className="text-xs text-gray-500">{products.length} productos en total</p>
          </div>
        </div>
        <Link to="/seller/products/new" className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-variant transition-colors">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Añadir</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto w-full p-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="draft">Borradores</option>
              <option value="archived">Archivados</option>
            </select>
          </div>
        </div>

        {/* Product List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No hay productos</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm">No se encontraron productos con los filtros actuales o tu catálogo está vacío.</p>
            <Link to="/seller/products/new" className="bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary-variant transition-colors">
              Crear mi primer producto
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="p-4 font-medium">Producto</th>
                    <th className="p-4 font-medium">Precio</th>
                    <th className="p-4 font-medium">Stock</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img src={product.image || 'https://placehold.co/100x100?text=No+Image'} alt={product.title} className="w-12 h-12 rounded-lg object-cover border border-gray-100 bg-white" />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{product.title}</p>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-900">${product.price.toFixed(2)}</td>
                      <td className="p-4">
                        {product.stock <= 0 ? (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">Agotado</span>
                        ) : product.stock <= 5 ? (
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Quedan {product.stock}</span>
                        ) : (
                          <span className="text-xs font-medium text-gray-600">{product.stock}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                          product.status === 'active' ? 'bg-green-100 text-green-700' :
                          product.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/seller/products/${product.id}/edit`} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleArchive(product.id, product.status)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-orange-500 hover:border-orange-500 transition-colors" title={product.status === 'archived' ? 'Activar' : 'Archivar'}>
                            <Archive className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-red-500 hover:border-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
