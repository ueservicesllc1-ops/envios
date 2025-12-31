import React, { useEffect } from 'react';
import StoreHeader from '../components/Layout/StoreHeader';

const ReturnsPolicyPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Política de Devoluciones | COMPRASEXPRESS";
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <StoreHeader />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold mb-6 text-gray-900">Política de Devoluciones</h1>

                    <div className="space-y-6 text-gray-600">
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">1. Condiciones Generales</h2>
                            <p>Aceptamos devoluciones dentro de los 30 días posteriores a la compra. Los productos deben estar sin usar, en su empaque original y en las mismas condiciones en que se recibieron.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">2. Proceso de Devolución</h2>
                            <p>Para iniciar una devolución, contáctanos a través de nuestro soporte. Te proporcionaremos las instrucciones y la etiqueta de envío si corresponde.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">3. Reembolsos</h2>
                            <p>Una vez recibida e inspeccionada tu devolución, te notificaremos sobre la aprobación o rechazo de tu reembolso. Si es aprobado, se procesará automáticamente a tu método de pago original.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">4. Artículos no Retornables</h2>
                            <p>Ciertos artículos como productos perecederos, tarjetas de regalo y artículos de cuidado personal pueden no ser elegibles para devolución.</p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReturnsPolicyPage;
