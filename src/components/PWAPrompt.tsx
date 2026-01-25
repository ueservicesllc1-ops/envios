import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

const PWAPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detectar si es iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        // Detectar si ya está instalada (Standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        if (isStandalone) return;

        // Manejador para Android/Desktop (beforeinstallprompt)
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Verificar si el usuario ya lo rechazó previamente (opcional, aquí reiniciamos para mostrar siempre que se pueda)
            // O podríamos usar localStorage para no molestar seguido.
            // Por solicitud del usuario: "una vez q lo instale ya no volver a pedirle", implicando que si NO está instalado, se pida.
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Para iOS, mostrar siempre si no está en standalone (podríamos limitar con localStorage)
        if (isIosDevice && !isStandalone) {
            // Check localStorage para no mostrar cada vez si lo cerró
            const lastPrompt = localStorage.getItem('pwaPromptDismissed');
            if (!lastPrompt) {
                setShowPrompt(true);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt && !isIOS) return;

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleClose = () => {
        setShowPrompt(false);
        // Guardar en localStorage para no mostrar inmediatamente de nuevo (ej: por 1 día o sesión)
        // El usuario pidió "una vez instale ya no volver a pedirle", pero si cierra sin instalar, ¿volvemos a pedir?
        // Lo dejaremos que pida en la siguiente recarga para insistir sutilmente, o guardamos dismissed.
        localStorage.setItem('pwaPromptDismissed', Date.now().toString());
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[100] animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl p-4 border border-blue-100 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">

                {/* Icon & Close Mobile */}
                <div className="flex w-full sm:w-auto items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                            <img src="/logo-compras-express.png" alt="App Icon" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="sm:hidden">
                            <h3 className="font-bold text-gray-900">Instalar App</h3>
                            <p className="text-xs text-gray-500">Acceso rápido y offline</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="sm:hidden text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Desktop */}
                <div className="hidden sm:block flex-1">
                    <h3 className="font-bold text-gray-900">Instalar Compras Express</h3>
                    <p className="text-sm text-gray-500">Instala la aplicación para una mejor experiencia</p>
                </div>

                {/* Actions */}
                <div className="w-full sm:w-auto flex flex-col space-y-2">
                    {isIOS ? (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            Para instalar en iOS: <br />
                            1. Toca el botón <span className="font-bold"><Share className="w-3 h-3 inline" /> Compartir</span> abajo <br />
                            2. Selecciona <span className="font-bold">"Agregar a Inicio"</span>
                        </div>
                    ) : (
                        <button
                            onClick={handleInstallClick}
                            className="w-full bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Instalar Ahora
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="hidden sm:block w-full text-xs text-gray-400 hover:text-gray-600 text-center"
                    >
                        Ahora no
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAPrompt;
