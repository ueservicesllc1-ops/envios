import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Minus, Plus, Trash2, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();
  const discount = subtotal > 20 ? 5 : 0;
  const total = Math.max(0, subtotal - discount);

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 pt-4 pb-24 items-center justify-center p-4">
        <ShoppingCart className="w-20 h-20 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Aún no tienes artículos en tu carrito. ¡Explora nuestras ofertas!</p>
        <Link to="/marketplace" className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-primary/30">
          Explorar Ofertas
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-dim pt-4 pb-24 md:pt-8 md:pb-8">
      <div className="max-w-5xl mx-auto w-full px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Lista de Productos */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tu Carrito ({totalItems})</h1>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {cartItems.map((item, index) => (
              <div key={item.id} className={`p-4 flex gap-4 ${index !== cartItems.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover mix-blend-multiply" />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <Link to={`/product/${item.id}`} className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-primary">
                      {item.title}
                    </Link>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-bold text-secondary">${item.price.toFixed(2)}</span>
                    {item.originalPrice && <span className="text-xs text-gray-400 line-through">${item.originalPrice.toFixed(2)}</span>}
                  </div>
                  <div className="mt-auto flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-full bg-white h-8 w-24">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex-1 flex justify-center items-center text-gray-500 hover:text-primary"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex-1 flex justify-center items-center text-gray-500 hover:text-primary"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 text-sm text-gray-600">
            <ShieldCheck className="w-5 h-5 text-tertiary flex-shrink-0" />
            <p><strong>Protección al comprador.</strong> Devolución íntegra si no recibes tu pedido.</p>
          </div>
        </div>

        {/* Resumen Order */}
        <div className="flex flex-col gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen</h2>
            
            <div className="space-y-3 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span className="font-medium text-tertiary">Gratis</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span>Descuentos</span>
                  <span className="font-medium text-secondary">-${discount.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-end mb-6">
              <span className="font-bold text-gray-900">Total</span>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-gray-900">${total.toFixed(2)}</span>
                <p className="text-xs text-gray-400">Impuestos incluidos</p>
              </div>
            </div>
            
            <Link to="/checkout" className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 rounded-full hover:bg-primary-variant transition-colors shadow-md shadow-primary/20">
              Proceder al Pago
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}