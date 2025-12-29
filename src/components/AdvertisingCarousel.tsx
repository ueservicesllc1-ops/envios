import React, { useEffect, useState } from 'react';
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

    useEffect(() => {
        // Validar que banners exista y sea un array
        if (!banners || !Array.isArray(banners)) return;

        // Filtrar solo banners habilitados con imagen
        const enabledBanners = banners.filter(b => b.enabled && b.imageUrl);

        if (enabledBanners.length === 0) return;

        // Seleccionar 4 aleatorios
        const shuffled = [...enabledBanners].sort(() => Math.random() - 0.5);
        setSelectedBanners(shuffled.slice(0, 4));
    }, [banners]);

    if (selectedBanners.length === 0) return null;

    return (
        <div className="container mx-auto px-4 py-6 mb-8">
            <div className="relative group">
                <div
                    id="advertising-carousel"
                    className="flex overflow-x-auto gap-4 snap-x scrollbar-hide scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {selectedBanners.map((banner) => (
                        <div
                            key={banner.id}
                            className="min-w-[250px] md:min-w-[280px] flex-shrink-0 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow snap-start"
                        >
                            <img
                                src={banner.imageUrl}
                                alt="Publicidad"
                                className="w-full h-40 md:h-48 object-cover hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    ))}
                </div>

                {/* Flechas de navegación */}
                <button
                    onClick={() => {
                        const el = document.getElementById('advertising-carousel');
                        if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                    }}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-gray-800 z-10 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                >
                    <ChevronDown className="h-5 w-5 transform rotate-90" />
                </button>
                <button
                    onClick={() => {
                        const el = document.getElementById('advertising-carousel');
                        if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                    }}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg text-gray-800 z-10 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                >
                    <ChevronDown className="h-5 w-5 transform -rotate-90" />
                </button>
            </div>
        </div>
    );
};

export default AdvertisingCarousel;
