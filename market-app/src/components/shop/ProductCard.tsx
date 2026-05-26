import * as React from "react"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

export interface ProductCardProps {
  title: string
  price: number
  originalPrice?: number
  image: string
  rating?: number
  soldCount?: number
  isFlashSale?: boolean
  className?: string
}

export function ProductCard({
  title,
  price,
  originalPrice,
  image,
  rating,
  soldCount,
  isFlashSale,
  className
}: ProductCardProps) {
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

  return (
    <div className={cn("flex flex-col bg-surface rounded-md border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow", className)}>
      <div className="relative aspect-square w-full bg-surface-dim p-2 flex items-center justify-center">
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
        <h3 className="text-body-sm font-medium text-on-background line-clamp-2 leading-tight h-10 mb-1">
          {title}
        </h3>
        
        <div className="mt-auto flex items-baseline gap-1">
          <span className="text-price-lg font-bold text-secondary">${price.toFixed(2)}</span>
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
      </div>
    </div>
  )
}
