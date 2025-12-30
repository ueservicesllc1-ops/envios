import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onFinish, 500); // Wait for fade out animation
        }, 2500); // Show for 2.5 seconds

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-sky-300 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            <div className="flex flex-col items-center animate-bounce-slow">
                <div className="mb-8 animate-pulse">
                    <img
                        src="/logo-splash.png"
                        alt="Compras Express"
                        className="h-20 w-auto object-contain drop-shadow-xl"
                    />
                </div>
                <div className="mt-4">
                    <div className="w-12 h-12 border-4 border-white border-t-yellow-400 rounded-full animate-spin"></div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
