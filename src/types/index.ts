// Tipos para Productos
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  size?: string; // Optional size field
  color?: string; // Optional color field
  color2?: string; // Optional second color field
  weight?: number; // Peso en gramos
  sku: string;
  cost: number;
  salePrice1: number;
  salePrice2: number;
  barcode?: string;
  imageUrl?: string;
  // Campos específicos para perfumes
  brand?: string; // Marca del perfume
  perfumeName?: string; // Nombre específico del perfume
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Inventario
export interface InventoryItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  cost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  totalValue: number;
  location: string;
  status: 'stock' | 'in-transit' | 'delivered'; // Estado del inventario
  sellerId?: string; // ID del vendedor (si está asignado)
  exitNoteId?: string; // ID de la nota de salida asociada
  lastUpdated: Date;
}

// Tipos para Notas de Entrada
export interface EntryNote {
  id: string;
  number: string;
  date: Date;
  supplier: string;
  location?: string;
  items: EntryNoteItem[];
  totalCost: number;
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  createdBy: string;
}

export interface EntryNoteItem {
  id: string;
  productId: string;
  product?: Product;
  quantity?: number;
  cost?: number;
  unitPrice?: number;
  totalCost?: number;
  totalPrice?: number;
  weight?: number; // Peso en gramos
}

// Tipos para Notas de Salida
export interface ExitNote {
  id: string;
  number: string;
  date: Date;
  sellerId: string;
  seller: string;
  customer: string;
  items: ExitNoteItem[];
  totalPrice: number;
  status: 'pending' | 'in-transit' | 'delivered' | 'received' | 'cancelled';
  notes?: string;
  receivedAt?: Date;
  shippingId?: string; // ID del envío asociado
  createdAt: Date;
  createdBy: string;
}

export interface ExitNoteItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  size?: string; // Talla del producto
  weight?: number; // Peso en gramos
  unitPrice: number;
  totalPrice: number;
}

// Tipos para Contabilidad
export interface AccountingEntry {
  id: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  account: string;
  reference: string;
  type: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
  createdAt: Date;
  createdBy: string;
}

// Tipos para Vendedores
export interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  commission: number;
  priceType?: 'price1' | 'price2'; // Opcional para compatibilidad con datos existentes
  isActive: boolean;
  totalDebt?: number;
  lastDeliveryDate?: Date;
  slug?: string; // Slug único para URL amigable (ej: "yenifer")
  createdAt: Date;
}

// Tipos para Proveedores
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
}

// Tipos para Clientes
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
}

// Tipos para Dashboard
export interface DashboardStats {
  totalProducts: number;
  totalInventory: number;
  totalValue: number;
  pendingEntries: number;
  pendingExits: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

// Tipos para Productos Vendidos
export interface SoldProduct {
  id: string;
  productId: string;
  product: Product;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleDate: Date;
  notes?: string;
  createdAt: Date;
  paymentType: 'credit' | 'cash';
  status: 'pending' | 'paid' | 'rejected';
  paymentNoteId?: string;
}

// Tipos para Inventario del Vendedor
export interface SellerInventoryItem {
  id: string;
  sellerId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  status: 'stock' | 'in-transit' | 'delivered';
  lastDeliveryDate: Date;
  exitNoteId?: string; // ID de la nota de salida que generó este inventario
}

// Tipos para Notas de Pago
export interface PaymentNote {
  id: string;
  number: string;
  sellerId: string;
  sellerName: string;
  items: PaymentNoteItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
}

export interface PaymentNoteItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
