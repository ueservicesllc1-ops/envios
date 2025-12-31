import React, { useEffect } from 'react';
import StoreHeader from '../components/Layout/StoreHeader';

const TermsPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Términos y Condiciones | COMPRASEXPRESS";
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <StoreHeader />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold mb-6 text-gray-900">Términos y Condiciones</h1>

                    <div className="space-y-6 text-gray-600">
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">1. Introducción</h2>
                            <p>Bienvenido a COMPRASEXPRESS. Al acceder a nuestro sitio web y realizar compras, aceptas cumplir con estos términos y condiciones. Por favor, léelos cuidadosamente.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">2. Uso del Sitio</h2>
                            <p>Te comprometes a utilizar nuestro sitio web únicamente con fines legales. No puedes usar nuestros productos para ningún propósito ilegal o no autorizado.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">3. Productos y Precios</h2>
                            <p>Todos los productos están sujetos a disponibilidad. Nos reservamos el derecho de modificar los precios en cualquier momento sin previo aviso.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">4. Envíos</h2>
                            <p>Realizamos envíos a las direcciones proporcionadas. Los tiempos de entrega son estimados y pueden variar debido a factores externos.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">5. Pagos</h2>
                            <p>Aceptamos pagos a través de PayPal, tarjetas de crédito/débito y transferencias bancarias. Todas las transacciones son seguras y encriptadas.</p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TermsPage;
