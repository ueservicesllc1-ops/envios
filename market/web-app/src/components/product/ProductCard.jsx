import { Star, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useWishlist } from '../../context/WishlistContext';

export default function ProductCard({
  id,
  title,
  price,
  originalPrice,
  image,
  rating,
  soldCount,
  isFlashSale,
  className
}) {
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const { toggleWishlist, isFavorite } = useWishlist();
  const navigate = useNavigate();
  const isFav = isFavorite(id);

  const handleWishlist = (e) => {
    e.stopPropagation(); 
    toggleWishlist({ id, title, price, originalPrice, image, rating, soldCount });
  };

  return (
    <div 
      onClick={() => navigate(`/product/${id}`)}
      className={cn("flex flex-col bg-surface rounded-md border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative cursor-pointer", className)}
    >
      <button 
        onClick={handleWishlist}
        className="absolute top-2 right-2 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm"
      >
        <Heart className={cn("w-4 h-4", isFav && "fill-red-500 text-red-500")} />
      </button>

      <div className="relative aspect-square w-full bg-surface-dim flex items-center justify-center p-2">
        {isFlashSale && (
          <span className="absolute top-2 left-2 bg-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10 uppercase tracking-wide">
            Flash Sale
          </span>
        )}
        {discount > 0 && !isFlashSale && (
          <span className="absolute top-2 left-2 bg-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10">
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
        <h3 className="text-sm font-medium text-on-background line-clamp-2 leading-tight h-10 mb-1">
          {title}
        </h3>
        
        <div className="mt-auto flex items-baseline gap-1">
          <span className="text-lg font-bold text-secondary">${price.toFixed(2)}</span>
          {originalPrice && (
            <span className="text-[10px] text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
          )}
        </div>
        
        {(rating || soldCount !== undefined) && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
            {rating && (
              <span className="flex items-center text-[#FFC107] font-medium">
                <Star className="w-3 h-3 fill-current mr-0.5" />
                {rating}
              </span>
            )}
            {rating && soldCount !== undefined && <span>•</span>}
            {soldCount !== undefined && (
              <span>{soldCount > 1000 ? `${(soldCount/1000).toFixed(1)}k+` : soldCount} vendidos</span>
            )}
          </div>
        )}
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/product/${id}`);
          }}
          className="mt-3 w-full bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary-variant transition-colors"
        >
          Comprar Ahora
        </button>
      </div>
    </div>
  );
}
