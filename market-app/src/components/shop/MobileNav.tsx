"use client"
import * as React from "react"
import { Home, Search, ShoppingCart, Video, User } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MobileNavProps {
  activeTab?: 'home' | 'search' | 'live' | 'cart' | 'profile'
  onTabChange?: (tab: 'home' | 'search' | 'live' | 'cart' | 'profile') => void
  cartItemCount?: number
}

export function MobileNav({ activeTab = 'home', onTabChange, cartItemCount = 0 }: MobileNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'search', icon: Search, label: 'Explorar' },
    { id: 'live', icon: Video, label: 'Live' },
    { id: 'cart', icon: ShoppingCart, label: 'Carrito', badge: cartItemCount },
    { id: 'profile', icon: User, label: 'Perfil' },
  ] as const

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 px-2 flex items-center justify-around z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange?.(tab.id)}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full transition-colors relative",
            activeTab === tab.id ? "text-primary" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <div className="relative">
            <tab.icon className={cn("w-6 h-6", activeTab === tab.id && "fill-current/10")} />
            {tab.badge && tab.badge > 0 ? (
              <span className="absolute -top-1 -right-2 bg-secondary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
