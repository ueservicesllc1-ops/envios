"use client"
import * as React from "react"
import { Search, Bell, Settings } from "lucide-react"
import { Input } from "@/components/ui/Input"

export interface HeaderProps {
  title?: string
  showSearch?: boolean
  showNotifications?: boolean
  showSettings?: boolean
}

export function Header({ title, showSearch = true, showNotifications = true, showSettings = false }: HeaderProps) {
  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm pt-safe">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        {title ? (
          <h1 className="text-title-md font-bold text-gray-900 truncate flex-1">{title}</h1>
        ) : (
          <div className="flex-1 font-extrabold text-xl text-primary tracking-tight">ShopVibe</div>
        )}
        
        {showSearch && (
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-9 h-9 bg-gray-50 border-transparent focus:bg-white focus:border-primary/50" 
            />
          </div>
        )}
        
        <div className="flex items-center gap-1">
          {showNotifications && (
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-50 relative">
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border border-white"></span>
            </button>
          )}
          {showSettings && (
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-50">
              <Settings className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
