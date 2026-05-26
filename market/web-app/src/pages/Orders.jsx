import { Link } from 'react-router-dom';
import { Package, ChevronRight, MapPin, ShoppingBag, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getUserOrders } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      if (user) {
        const data = await getUserOrders(user.uid);
        setOrders(data);
      }
      setLoading(false);
    }
    loadOrders();
  }, [user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }


  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white p-4 sticky top-16 z-30 shadow-sm border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Mis Pedidos</h1>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">No tienes pedidos</h2>
            <p className="text-gray-500 mb-6 text-sm">Aún no has realizado ninguna compra.</p>
            <Link to="/marketplace" className="bg-primary text-white font-bold py-2.5 px-6 rounded-full inline-block">
              Explorar productos
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Pedido {order.id}</p>
                  <p className="text-sm font-bold text-gray-900">{order.date}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  order.status === 'Procesando' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'En Camino' ? 'bg-orange-100 text-orange-700' :
                  order.status === 'Entregado' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                )}>
                  {order.status}
                </div>
              </div>
              
              <div className="p-4">
                {order.items.map((item) => (
                  <Link to={`/product/${item.id}`} key={item.id} className="flex gap-4 items-center group mb-4 last:mb-0">
                    <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">Cant: {item.quantity}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">${item.price.toFixed(2)}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </Link>
                ))}
              </div>
              
              <div className="p-4 border-t border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="w-4 h-4" /> Entregar a: Juan Pérez
                </div>
                <p className="font-bold text-gray-900">Total: ${order.total.toFixed(2)}</p>
              </div>
              
              {order.status === 'En Camino' && (
                <div className="px-4 pb-4">
                  <button className="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-lg text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                    <Package className="w-4 h-4" /> Rastrear Paquete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}