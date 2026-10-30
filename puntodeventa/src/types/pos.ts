export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  brand?: string;
  category?: string;
  salePrice1: number;
  salePrice2?: number;
  pvp?: number;
  imageUrl?: string;
  perfumeName?: string;
  stockBabahoyo?: number;
  stockPrincipal?: number;
  totalStock?: number;
}

export interface PosCartItem {
  id: string;
  productId: string;
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  availableStock: number;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';

export interface PosSale {
  id?: string;
  saleNumber?: string;
  date: Date;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: PosCartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  cardAmount?: number;
  transferAmount?: number;
  status: 'completed' | 'cancelled';
  createdBy?: string;
  location?: string;
}

export interface PosCustomer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  totalPurchases?: number;
  lastPurchaseDate?: Date;
  isActive?: boolean;
}
