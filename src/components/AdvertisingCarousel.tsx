import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface AdvertisingBanner {
    id: string;
    imageUrl: string;
    enabled: boolean;
}

interface AdvertisingCarouselProps {
    banners: AdvertisingBanner[];
}

const AdvertisingCarousel: React.FC<AdvertisingCarouselProps> = ({ banners }) => {
    const [selectedBanners, setSelectedBanners] = useState<AdvertisingBanner[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Validar que banners exista y sea un array
        if (!banners || !Array.isArray(banners)) return;

        // Filtrar solo banners habilitados con imagen
        const enabledBanners = banners.filter(b => b.enabled && b.imageUrl);

        if (enabledBanners.length === 0) return;

        // Mostrar todos los disponibles aleatoriamente
        const shuffled = [...enabledBanners].sort(() => Math.random() - 0.5);
        setSelectedBanners(shuffled);
    }, [banners]);

    // Efecto de Autoplay
    useEffect(() => {
        if (selectedBanners.length <= 1) return;

        const interval = setInterval(() => {
            const el = scrollRef.current;
            if (el) {
                const scrollAmount = el.clientWidth > 500 ? 500 : 320;
                // Si llegamos cerca del final, volvemos al principio, si no, avanzamos
                if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 50) {
                    el.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            }
        }, 4000); // Cada 4 segundos para que dé tiempo a verlo

        return () => clearInterval(interval);
    }, [selectedBanners]);

    if (selectedBanners.length === 0) return null;

    return (
        <div className="w-full py-4 overflow-hidden">
            <div className="container mx-auto px-4 relative group">
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 snap-x scrollbar-hide scroll-smooth py-2"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        justifyContent: selectedBanners.length < 3 ? 'center' : 'start'
                    }}
                >
                    {selectedBanners.map((banner, index) => (
                        <div
                            key={`${banner.id}-${index}`}
                            className="min-w-[220px] md:min-w-[350px] h-36 md:h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all snap-start border border-gray-100"
                        >
                            <img
                                src={banner.imageUrl}
                                alt="Publicidad"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>

                {/* Flechas de navegación (solo si hay suficientes banners) */}
                {selectedBanners.length > 1 && (
                    <>
                        <button
                            onClick={() => {
                                const el = scrollRef.current;
                                if (el) el.scrollBy({ left: -400, behavior: 'smooth' });
                            }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-blue-900 z-10 hover:bg-white transition-all opacity-0 group-hover:opacity-100 -ml-2"
                        >
                            <ChevronDown className="h-5 w-5 transform rotate-90" />
                        </button>
                        <button
                            onClick={() => {
                                const el = scrollRef.current;
                                if (el) el.scrollBy({ left: 400, behavior: 'smooth' });
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-blue-900 z-10 hover:bg-white transition-all opacity-0 group-hover:opacity-100 -mr-2"
                        >
                            <ChevronDown className="h-5 w-5 transform -rotate-90" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdvertisingCarousel;
