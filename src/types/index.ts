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
  originalPrice?: number; // Precio original de venta en tiendas físicas
  barcode?: string;
  imageUrl?: string;
  images?: string[]; // Additional images for carousel
  origin?: 'local' | 'fivebelow' | 'walgreens'; // Origen del producto
  // Campos específicos para perfumes
  brand?: string; // Marca del perfume
  perfumeName?: string; // Nombre específico del perfume
  // Campos para productos consolidados
  isConsolidated?: boolean; // Si es un producto consolidado
  consolidatedProducts?: string[]; // IDs de los productos que forman este consolidado
  parentConsolidatedId?: string; // ID del producto consolidado padre (si este es parte de uno)
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
  trackingNumber?: string; // Número de tracking
  createdAt: Date;
  createdBy: string;
  paymentStatus?: 'pending' | 'partial' | 'paid'; // Estado de pago
  amountPaid?: number; // Monto pagado
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
  returnedQuantity?: number; // Cantidad devuelta (productos marcados como devueltos)
}

// Tipos para Notas de Pago
export interface PaymentNote {
  id: string;
  number: string;
  sellerId?: string;
  sellerName?: string;
  items: PaymentNoteItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
  paymentDate?: Date;
  reference?: string;
  paymentMethod?: 'cash' | 'bank_deposit';
  receiptImageUrl?: string;
  sourceType?: 'seller' | 'customer';
}

export interface PaymentNoteItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Tipos para Devoluciones
export interface Return {
  id: string;
  number: string;
  sellerId: string;
  sellerName: string;
  items: ReturnItem[];
  totalValue: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface ReturnItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string; // Razón de la devolución
}

// Tipos para Perfumes (productos de pedido, no integrados al inventario)
export interface Perfume {
  id: string;
  name: string;
  description?: string;
  descriptionEs?: string; // Descripción en español
  descriptionEn?: string; // Descripción en inglés
  brand: string; // Marca del perfume (ej: Arabiyat, Lattafa, Armaf)
  collection?: string; // Colección dentro de la marca (ej: Sugar, Prestige)
  sku: string;
  price: number; // Precio de venta
  originalPrice?: number; // Precio original si hay descuento
  discountPercentage?: number; // Porcentaje de descuento (0-99), por defecto 30%
  imageUrl?: string;
  shopifyProductId?: string; // ID del producto en Shopify
  shopifyVariantId?: string; // ID de la variante en Shopify
  isActive: boolean; // Si está visible en la tienda
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Point of Sale (POS) - Sistema de Facturación
export interface PointOfSale {
  id: string;
  saleNumber: string; // Formato: POS-000001
  date: Date;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: POSItem[];
  subtotal: number;
  tax: number; // IVA si aplica (0% por ahora)
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed';
  cashReceived?: number;
  change?: number;
  cardAmount?: number;
  transferAmount?: number;
  status: 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  receiptUrl?: string; // URL del recibo PDF
  cashRegisterId?: string; // ID de la caja que procesó la venta
  createdBy: string; // Usuario que realizó la venta
  createdAt: Date;
}

export interface POSItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number; // Descuento por item
  totalPrice: number; // (unitPrice * quantity) - discount
}

// Cash Register - Caja Registradora
export interface CashRegister {
  id: string;
  registerNumber: string;
  openedAt: Date;
  openedBy: string;
  closedAt?: Date;
  closedBy?: string;
  initialCash: number; // Fondo inicial
  finalCash?: number; // Efectivo al cerrar
  totalSales: number; // Total de ventas
  totalCash: number; // Total en efectivo
  totalCard: number; // Total con tarjeta
  totalTransfer: number; // Total por transferencia
  expectedCash: number; // Efectivo esperado: initialCash + totalCash
  cashDifference?: number; // Diferencia: finalCash - expectedCash
  salesCount: number; // Número de ventas
  status: 'open' | 'closed';
  notes?: string;
  createdAt: Date;
}

// Customer - Cliente para POS
export interface POSCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  totalPurchases: number; // Total histórico de compras
  lastPurchaseDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
