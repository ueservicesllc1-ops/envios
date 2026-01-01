import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';

const OrderSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { orderNumber } = location.state || { orderNumber: '---' };

    useEffect(() => {
        // Disparar confeti al cargar
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                </div>

                <h1 className="text-3xl font-black text-gray-900">¡Pago Exitoso!</h1>

                <div className="space-y-2">
                    <p className="text-gray-600">
                        Tu pedido ha sido procesado correctamente.
                        Hemos enviado los detalles a tu correo electrónico.
                    </p>
                    <div className="bg-gray-100 p-3 rounded-lg inline-block">
                        <span className="text-sm text-gray-500 block">Número de Orden</span>
                        <span className="font-mono font-bold text-xl text-blue-900">{orderNumber}</span>
                    </div>

                    {location.state?.securityCode && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                            <p className="text-sm text-yellow-800 font-bold mb-1 uppercase">Código de Retiro</p>
                            <p className="text-3xl font-black text-gray-900 tracking-widest">{location.state.securityCode}</p>
                            <p className="text-xs text-gray-500 mt-1">Preséntalo al retirar tu pedido</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 space-y-3">
                    <button
                        onClick={() => navigate('/my-orders')}
                        className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                        <Package className="w-5 h-5" />
                        Ver Mis Pedidos
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-white text-gray-700 border-2 border-gray-100 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        Seguir Comprando
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
