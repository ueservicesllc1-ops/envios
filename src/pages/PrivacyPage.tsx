import React, { useEffect } from 'react';
import StoreHeader from '../components/Layout/StoreHeader';

const PrivacyPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Política de Privacidad | COMPRASEXPRESS";
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <StoreHeader />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold mb-6 text-gray-900">Política de Privacidad</h1>

                    <div className="space-y-6 text-gray-600">
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">1. Recopilación de Información</h2>
                            <p>Recopilamos información personal que nos proporcionas al registrarte, realizar un pedido o suscribirte a nuestro boletín. Esto incluye tu nombre, dirección, correo electrónico y número de teléfono.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">2. Uso de la Información</h2>
                            <p>Utilizamos tu información para procesar pedidos, mejorar nuestro servicio al cliente y enviarte actualizaciones sobre tus compras.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">3. Protección de Datos</h2>
                            <p>Implementamos medidas de seguridad para proteger tu información personal. No compartimos ni vendemos tus datos a terceros con fines comerciales.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">4. Cookies</h2>
                            <p>Utilizamos cookies para mejorar tu experiencia en nuestro sitio web. Puedes configurar tu navegador para rechazar las cookies si lo prefieres.</p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPage;
