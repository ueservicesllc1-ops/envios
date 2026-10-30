export interface OlfactoryNotes {
  top: string[];
  middle: string[];
  base: string[];
}

export interface PerfumeStock {
  local: number;
  bodegaEc: number;
  bodegaUsa: number;
  total: number;
}

export interface PerfumeItem {
  id: string;
  name: string;
  brand: string;
  collection?: string;
  sku: string;
  barcode?: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  images?: string[];
  description?: string;
  descriptionEs?: string;
  
  // AI & Olfactory Data
  dupeOf?: string;
  dupeBrand?: string;
  olfactoryFamily?: string;
  gender?: 'Hombre' | 'Mujer' | 'Unisex';
  concentration?: string;
  size?: string;
  notes?: OlfactoryNotes;
  mainAccords?: string[];
  longevity?: string;
  bestOccasion?: string;
  salesPitch?: string;
  aiEnriched?: boolean;

  // Real-time Inventory Data
  stock: PerfumeStock;
  isActive: boolean;
  sourceCollection: 'perfumes' | 'products';
}

export type CatalogTab = 'catalogo' | 'escanear' | 'buscar' | 'favoritos';

export type SortOption = 'relevance' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-desc';
