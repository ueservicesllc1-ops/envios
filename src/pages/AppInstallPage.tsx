import React, { useState, useEffect } from 'react';
import { Download, Share, CheckCircle, ArrowRight, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AppInstallPage: React.FC = () => {
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        // Detectar tipo de dispositivo
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroidDevice = /android/i.test(userAgent);

        setIsIOS(isIosDevice);
        setIsAndroid(isAndroidDevice);

        // Detectar si ya está instalada
        const inStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        setIsStandalone(inStandalone);

        // Capturar evento de instalación
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        }
    };

    // Si ya está instalada o abierta como app
    if (isStandalone) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="bg-white/20 p-6 rounded-full mb-6 backdrop-blur-md animate-pulse">
                    <CheckCircle className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-4">¡Ya estás listo!</h1>
                <p className="text-blue-100 text-lg mb-8 max-w-sm">
                    La aplicación ya está instalada y funcionando correctamente.
                </p>
                <button
                    onClick={() => navigate('/app')}
                    className="bg-white text-blue-700 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-50 transition-all flex items-center"
                >
                    Ir al Inicio <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 pb-8">
                {/* Header Visual */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 transform rotate-3">
                            <img src="/logo-compras-express.png" alt="Logo" className="w-20 h-20 object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Compras Express</h1>
                        <p className="text-blue-100 text-sm">App Oficial para Vendedores</p>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-gray-800">Instalar Aplicación</h2>
                        <p className="text-gray-500 text-sm">
                            Obtén acceso rápido a tu dashboard, inventario y gestión de pagos.
                        </p>
                    </div>

                    {/* Instrucciones Dinámicas */}
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                        {isIOS ? (
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3 text-blue-900 font-medium">
                                    <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    <span>Toca el botón <strong>Compartir</strong> <Share className="w-4 h-4 inline mx-1" /></span>
                                </div>
                                <div className="flex items-center space-x-3 text-blue-900 font-medium">
                                    <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    <span>Selecciona <strong>"Agregar a Inicio"</strong></span>
                                </div>
                                <div className="flex items-center space-x-3 text-blue-900 font-medium">
                                    <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                    <span>Confirma tocando <strong>"Agregar"</strong></span>
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-xs text-blue-400 animate-bounce">
                                        👇 El botón está en la barra inferior de tu navegador
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                {deferredPrompt ? (
                                    <>
                                        <p className="text-blue-800 mb-4 font-medium">¡Todo listo para instalar!</p>
                                        <button
                                            onClick={handleInstallClick}
                                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-blue-300 shadow-lg hover:shadow-blue-400 transform hover:-translate-y-1 transition-all flex items-center justify-center"
                                        >
                                            <Download className="w-6 h-6 mr-2" />
                                            Instalar Ahora
                                        </button>
                                    </>
                                ) : (
                                    <div className="py-2">
                                        <p className="text-gray-600 mb-4 text-sm">
                                            Si no ves el botón de instalación, usa el menú de tu navegador ({isAndroid ? 'tres puntos ⋮' : 'opciones'}) y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong>.
                                        </p>
                                        <button
                                            onClick={() => navigate('/app')}
                                            className="text-blue-600 font-semibold text-sm hover:underline"
                                        >
                                            Continuar sin instalar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Características */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                            <Smartphone className="w-6 h-6 text-gray-400 mb-2" />
                            <span className="text-xs font-medium text-gray-600">Acceso Directo</span>
                        </div>
                        <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                            <Download className="w-6 h-6 text-gray-400 mb-2" />
                            <span className="text-xs font-medium text-gray-600">Modo Offline</span>
                        </div>
                    </div>
                </div>
            </div>

            <p className="mt-8 text-gray-400 text-xs">Versión 1.0.0 • Compras Express PWA</p>
        </div>
    );
};

export default AppInstallPage;
