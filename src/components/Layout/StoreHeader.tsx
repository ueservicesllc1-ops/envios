import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const StoreHeader = () => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-40 bg-blue-900 shadow-md">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo / Nombre */}
                    <div
                        className="flex flex-col cursor-pointer"
                        onClick={() => navigate('/')}
                    >
                        <div className="flex items-center gap-2">
                            <img src="/logo-compras-nuevo.png" alt="Compras Express" className="h-8 md:h-10 object-contain" />
                        </div>
                        <span className="text-[10px] text-yellow-400 font-medium tracking-wide mt-1 hidden md:block">
                            Compra en USA y recíbelo en Ecuador
                        </span>
                    </div>

                    {/* Botón Volver */}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-bold text-sm">Volver a la Tienda</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default StoreHeader;
