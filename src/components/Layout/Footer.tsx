import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../config/api.config';

const Footer: React.FC = () => {
    const [visits, setVisits] = useState<number>(1); // Start with 1 (current user)

    useEffect(() => {
        const fetchVisits = async () => {
            try {
                const response = await fetch(getApiUrl('/api/visits'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setVisits(data.count);
                } else {
                    console.error("Failed to fetch visits");
                }
            } catch (error) {
                console.error('Error fetching visits:', error);
                // Fallback to 1 is already set
            }
        };

        fetchVisits();
    }, []);

    return (
        <footer className="bg-blue-900 text-white py-8 mt-auto border-t border-blue-800">
            <div className="container mx-auto px-4 flex flex-col items-center justify-center space-y-4">
                <div className="text-center">
                    <p className="font-bold text-lg tracking-wide">Compras Express 2025</p>
                    <p className="text-xs text-blue-200 mt-1 uppercase tracking-wider">
                        Potenciado y diseñado por <a href="https://freedomlabs.dev/" target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors">Freedom Labs</a>
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center pt-2 border-t border-blue-800/50 w-full max-w-[200px]">
                    <span className="text-[10px] text-blue-300 uppercase tracking-widest mb-1">Visitas Totales</span>
                    <span className="font-mono text-lg text-yellow-400 font-bold tracking-wider relative group cursor-default">
                        {visits.toLocaleString()}
                        <div className="absolute -bottom-1 left-0 w-full h-[1px] bg-yellow-400/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
