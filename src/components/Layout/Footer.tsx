import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-blue-900 text-white py-8 mt-auto border-t border-blue-800">
            <div className="container mx-auto px-4 flex flex-col items-center justify-center space-y-2">
                <div className="text-center">
                    <p className="font-bold text-lg tracking-wide">Compras Express 2025</p>
                    <p className="text-xs text-blue-200 mt-1 uppercase tracking-wider">
                        Potenciado y diseñado por <a href="https://freedomlabs.dev/" target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors">Freedom Labs</a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
