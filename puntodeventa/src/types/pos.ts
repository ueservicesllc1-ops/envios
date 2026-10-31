export interface Staff {
  id: string;
  name: string;
  role: 'advisor' | 'manager' | 'owner' | string;
}

export type PosLocationId = 'local' | 'todas_bodegas' | 'bodega_ec' | 'bodega_usa';

export interface PosLocation {
  id: PosLocationId;
  label: string;
}

export const POS_LOCATIONS: Record<PosLocationId, PosLocation> = {
  local: { id: 'local', label: 'Tienda Local' },
  todas_bodegas: { id: 'todas_bodegas', label: 'Todas las Bodegas' },
  bodega_ec: { id: 'bodega_ec', label: 'Bodega Ecuador' },
  bodega_usa: { id: 'bodega_usa', label: 'Bodega USA' },
};

export interface PosSession {
  staff: Staff;
  location: string;
  priceField: string;
  maxDiscountPct: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  barcode: string;
  imageUrl?: string;
  price: number;
  stockLocal: number;
  stockBodegaEc: number;
  stockBodegaUsa: number;
  description?: string;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export type PayMethod = 'cash' | 'card' | 'transfer' | 'mixed';

export interface PaymentInput {
  method: PayMethod;
  cashReceived: number;
  cardAmount: number;
  transferAmount: number;
  reference: string;
}

export interface SaleResult {
  saleNumber: string;
  total: number;
  change: number;
  duplicate?: boolean;
}

export interface PosClient {
  id: string;
  nombre: string;
  apellido: string;
  fullName: string;
  telefono: string;
  email: string;
  cedula: string;
}

export interface PosSaleItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PosSaleRecord {
  id: string;
  saleNumber: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  paymentMethod: string;
  customerName: string;
  customerCedula: string;
  customerEmail: string;
  staffName: string;
  createdAt: string;
  items: PosSaleItem[];
}

export interface TopPerfume {
  name: string;
  qty: number;
  total: number;
}

export interface PosReports {
  totalSalesCount: number;
  totalRevenue: number;
  totalItemsSold: number;
  byMethod: Record<string, number>;
  topPerfumes: TopPerfume[];
}

export interface EmailConfigStatus {
  configured: boolean;
  user: string;
  instructionsUrl: string;
}

export interface ReceiptItem {
  productId: string;
  name: string;
  barcode: string;
  expectedQty: number;
  receivedQty: number;
}

export interface LocalReceipt {
  id: string;
  number: string;
  status: 'pending' | 'completed' | 'closed' | string;
  notes: string;
  createdAt: string;
  items: ReceiptItem[];
}
