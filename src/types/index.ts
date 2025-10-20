// Tipos para Productos
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  size?: string; // Optional size field
  color?: string; // Optional color field
  sku: string;
  cost: number;
  salePrice1: number;
  salePrice2: number;
  barcode?: string;
  imageUrl?: string;
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
  product: Product;
  quantity: number;
  cost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
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
  status: 'pending' | 'delivered' | 'received' | 'cancelled';
  notes?: string;
  receivedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface ExitNoteItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
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
  paymentStatus: 'pending' | 'paid';
  paymentNoteId?: string;
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
