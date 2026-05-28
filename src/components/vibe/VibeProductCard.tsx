import React from 'react';
import { Star, Heart, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import toast from 'react-hot-toast';

import { useVibeConfig } from '../../contexts/VibeConfigContext';

// Simple clsx equivalent
const cn = (...classes: (string | undefined | false | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface VibeProductCardProps {
  product: any; // Type it properly later based on existing Product type
  className?: string;
  isFlashSale?: boolean;
}

export default function VibeProductCard({
  product,
  className,
  isFlashSale
}: VibeProductCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { config: vibeConfig } = useVibeConfig();

  // Handle both types of products (Bodega Ecuador / SellerStore)
  const id = product.id || product.productId;
  const title = product.name || product.product?.name || 'Producto';
  const price = product.pvp || product.salePrice1 || product.originalPrice || product.salePrice || 0;
  
  // Calculate the fake original price based on the global discount configuration
  const discountMultiplier = 1 + ((vibeConfig?.fakeDiscountPercentage || 0) / 100);
  const originalPrice = (vibeConfig?.fakeDiscountPercentage && vibeConfig.fakeDiscountPercentage > 0) 
    ? (price * discountMultiplier) 
    : (product.originalPrice || (price * 1.2)); 
    
  const image = product.imageUrl || product.images?.[0] || product.product?.images?.[0] || 'https://via.placeholder.com/300';
  
  const discount = originalPrice && originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100) 
    : 0;
    
  // Fake rating for demo purposes since it's not in db yet
  const rating = 4.5;
  const soldCount = 120;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 'product');
    toast.success(`¡${title} añadido!`, {
      icon: '🛒',
    });
  };

  return (
    <div 
      onClick={() => navigate(`/product/${id}`)}
      className={cn("flex flex-col bg-white rounded-md border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative cursor-pointer", className)}
    >
      <button 
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm"
      >
        <Heart className="w-4 h-4" />
      </button>

      <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center p-2">
        {isFlashSale && (
          <span className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10 uppercase tracking-wide">
            Flash Sale
          </span>
        )}
        {discount > 0 && !isFlashSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10">
            -{discount}%
          </span>
        )}
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
      
      <div className="p-2 flex flex-col flex-1">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight h-10 mb-1">
          {title}
        </h3>
        
        <div className="mt-auto flex items-baseline gap-1">
          <span className="text-lg font-bold text-gray-900">${Number(price).toFixed(2)}</span>
          {originalPrice && originalPrice > price && (
            <span className="text-[10px] text-gray-400 line-through">${Number(originalPrice).toFixed(2)}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
          <span className="flex items-center text-[#FFC107] font-medium">
            <Star className="w-3 h-3 fill-current mr-0.5" />
            {rating}
          </span>
          <span>•</span>
          <span>{soldCount} vendidos</span>
        </div>
        
        <div className="mt-3 flex gap-1">
          <button 
            onClick={(e) => {
                e.stopPropagation();
                navigate(`/ar/${id}`);
            }}
            className="flex-1 bg-black text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1 border border-black"
          >
            <Camera className="w-3.5 h-3.5" />
            AR
          </button>
          
          <button 
            onClick={handleAddToCart}
            className="flex-[2] bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors border border-blue-600"
          >
            Añadir al carrito
          </button>
        </div>
      </div>
    </div>
  );
}
