import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, MapPin, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { useState } from 'react';

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, subtotal, clearCart, totalItems, shipping, tax, total } = useCart();
  const { addToast } = useToast();
  const { user, isFirebaseConfigured } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (isFirebaseConfigured && !user) {
      addToast('Debes iniciar sesión para comprar', 'error');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const newOrder = {
        userId: user?.uid || 'local_guest',
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'Procesando',
        total,
        items: cartItems
      };
      
      await createOrder(newOrder);
      clearCart();
      addToast('¡Pedido realizado con éxito!', 'success');
      navigate('/orders');
    } catch (error) {
      addToast('Error al procesar el pedido', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center p-4 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No hay nada que pagar</h2>
        <p className="text-gray-500 mb-6">Tu carrito está vacío.</p>
        <Link to="/marketplace" className="bg-primary text-white font-bold py-3 px-8 rounded-full">Ir a comprar</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-safe">
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-30 flex items-center gap-3">
        <Link to="/cart" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </Link>
        <h1 className="font-bold text-lg text-gray-900">Checkout</h1>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full flex flex-col gap-4">
        
        {/* Dirección de Envío */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Dirección de Envío
            </h2>
            <button className="text-primary text-sm font-bold">Editar</button>
          </div>
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-900">Juan Pérez</p>
            <p>Av. Principal 123, Edificio Centro</p>
            <p>Ciudad, Estado, 10001</p>
            <p>+1 234 567 8900</p>
          </div>
        </section>

        {/* Método de Pago */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Método de Pago
            </h2>
          </div>
          <div className="flex items-center gap-3 p-3 border border-primary/20 bg-primary/5 rounded-lg cursor-pointer">
            <div className="w-8 h-5 bg-gray-900 rounded flex items-center justify-center text-[8px] text-white font-bold">VISA</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">•••• 4242</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
        </section>

        {/* Resumen del Pedido */}
        <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-primary" /> Resumen del Pedido ({totalItems} items)
          </h2>
          
          <div className="space-y-3 mb-4 pb-4 border-b border-gray-100 max-h-48 overflow-y-auto pr-2">
            {cartItems.map(item => (
              <div key={item.id} className="flex gap-3">
                <img src={item.image} className="w-12 h-12 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xs font-semibold line-clamp-1">{item.title}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">Cant: {item.quantity}</p>
                    <p className="text-sm font-bold text-secondary">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Subtotal</span> <span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Envío</span> <span className="text-tertiary font-medium">{shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)}`}</span></div>
            <div className="flex justify-between"><span>Impuestos (12%)</span> <span>${tax.toFixed(2)}</span></div>
            
            <div className="flex justify-between font-bold text-gray-900 text-base mt-2 pt-2 border-t border-gray-100">
              <span>Total a pagar</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        <button 
          onClick={handleCheckout} 
          disabled={loading}
          className="w-full bg-primary text-white font-bold text-lg py-4 rounded-full text-center shadow-lg shadow-primary/30 mt-4 hover:bg-primary-variant transition-colors disabled:opacity-50"
        >
          {loading ? 'Procesando...' : 'Confirmar y Pagar'}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">Al realizar el pedido aceptas nuestros términos y condiciones.</p>

      </div>
    </div>
  );
}