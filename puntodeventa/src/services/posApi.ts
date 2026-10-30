import {
  Staff,
  PosSession,
  Product,
  CartLine,
  PaymentInput,
  SaleResult,
  PosClient,
  PosSaleRecord,
  PosReports,
  EmailConfigStatus,
  LocalReceipt,
} from '../types/pos';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDaPRQEibEf7rpwvd9g-APfTad0JCVVFHw",
  authDomain: "envios-aaf94.firebaseapp.com",
  projectId: "envios-aaf94",
  storageBucket: "envios-aaf94.firebasestorage.app",
  messagingSenderId: "301889994673",
  appId: "1:301889994673:web:0b72ebf814b7f8c1b9b1e9"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const posAuth = getAuth(app);

class PosApiClient {
  private baseUrls = [
    '/api/pos',
    'http://127.0.0.1:5000/api/pos',
    'http://192.168.1.240:5000/api/pos',
  ];

  private async getIdToken(): Promise<string | null> {
    const user = posAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }

  private async request(path: string, method: 'GET' | 'POST' = 'GET', body?: any, requireAuth: boolean = true): Promise<any> {
    const idToken = requireAuth ? await this.getIdToken() : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    let lastError: any = null;
    for (const base of this.baseUrls) {
      try {
        const url = `${base}${path}`;
        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        return data;
      } catch (err: any) {
        lastError = err;
        // Si no es un 404 del servidor (por ejemplo problema de ruta relativa), intentar otra base
        if (err.message && err.message.includes('404')) {
          continue;
        }
        // Si es error de credenciales o validación, lanzar inmediatamente
        if (err.message && (err.message.includes('incorrecto') || err.message.includes('bloqueada') || err.message.includes('inválido'))) {
          throw err;
        }
      }
    }
    throw lastError || new Error('No se pudo conectar con el servidor POS');
  }

  // 1. Staff
  async getStaff(): Promise<Staff[]> {
    const res = await this.request('/staff', 'GET', null, false);
    return res.staff || [];
  }

  // 2. Auth con PIN
  async auth(staffId: string, pin: string, deviceId: string = 'ipad-pro'): Promise<{ customToken: string; staff: Staff; settings: any }> {
    const res = await this.request('/auth', 'POST', { staffId, pin, deviceId }, false);
    if (res.customToken) {
      await signInWithCustomToken(posAuth, res.customToken);
    }
    return res;
  }

  async logout(): Promise<void> {
    await signOut(posAuth);
  }

  // 3. Crear Venta
  async createSale(
    clientSaleId: string,
    deviceId: string,
    lines: CartLine[],
    discountPct: number,
    payment: PaymentInput,
    customerName?: string,
    client?: PosClient | null
  ): Promise<SaleResult> {
    const items = lines.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
    }));

    const body: any = {
      clientSaleId,
      deviceId,
      items,
      discountPct,
      payment: {
        method: payment.method,
        cashReceived: payment.cashReceived,
        cardAmount: payment.cardAmount,
        transferAmount: payment.transferAmount,
        reference: payment.reference,
      },
    };

    if (client) {
      body.customer = {
        id: client.id,
        nombre: client.nombre,
        apellido: client.apellido,
        fullName: client.fullName,
        telefono: client.telefono,
        email: client.email,
        cedula: client.cedula,
      };
      body.customerName = client.fullName;
      body.customerEmail = client.email;
      body.customerPhone = client.telefono;
    } else if (customerName && customerName.trim()) {
      body.customerName = customerName.trim();
    }

    const res = await this.request('/sales', 'POST', body, true);
    return {
      saleNumber: res.saleNumber,
      total: Number(res.total) || 0,
      change: Number(res.change) || 0,
      duplicate: Boolean(res.duplicate),
    };
  }

  // 4. Historial de Ventas
  async getSales(): Promise<PosSaleRecord[]> {
    const res = await this.request('/sales', 'GET', null, true);
    return res.sales || [];
  }

  // 5. Reportes
  async getReports(): Promise<PosReports> {
    const res = await this.request('/reports', 'GET', null, true);
    return {
      totalSalesCount: Number(res.totalSalesCount) || 0,
      totalRevenue: Number(res.totalRevenue) || 0,
      totalItemsSold: Number(res.totalItemsSold) || 0,
      byMethod: res.byMethod || {},
      topPerfumes: res.topPerfumes || [],
    };
  }

  // 6. Clientes
  async getClients(query: string = ''): Promise<PosClient[]> {
    const path = `/clients${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    const res = await this.request(path, 'GET', null, true);
    const list = res.clients || [];
    return list.map((c: any) => ({
      id: c.id,
      nombre: c.nombre || '',
      apellido: c.apellido || '',
      fullName: `${c.nombre || ''} ${c.apellido || ''}`.trim() || c.nombre || 'Cliente',
      telefono: c.telefono || '',
      email: c.email || '',
      cedula: c.cedula || '',
    }));
  }

  async saveClient(client: Partial<PosClient>): Promise<PosClient> {
    const res = await this.request('/clients', 'POST', client, true);
    const c = res.client;
    return {
      id: c.id,
      nombre: c.nombre || '',
      apellido: c.apellido || '',
      fullName: `${c.nombre || ''} ${c.apellido || ''}`.trim() || c.nombre,
      telefono: c.telefono || '',
      email: c.email || '',
      cedula: c.cedula || '',
    };
  }

  // 7. Guardar ticket en espera (Hold)
  async holdSale(items: any[], subtotal: number, customer?: any, note?: string): Promise<string> {
    const res = await this.request('/sales/hold', 'POST', { items, subtotal, customer, note }, true);
    return res.id;
  }

  // 8. Reenviar recibo por correo
  async resendReceiptEmail(saleId: string, email: string): Promise<any> {
    return await this.request(`/sales/${saleId}/email`, 'POST', { email }, true);
  }

  // 9. Estado y test de email
  async getEmailStatus(): Promise<EmailConfigStatus> {
    const res = await this.request('/email/status', 'GET', null, true);
    return res;
  }

  async testSendEmail(email: string): Promise<any> {
    return await this.request('/email/test', 'POST', { email }, true);
  }

  // 10. Ingreso de Mercadería
  async getReceipts(): Promise<LocalReceipt[]> {
    const res = await this.request('/receipts', 'GET', null, true);
    return res.receipts || [];
  }

  async scanReceipt(receiptId: string, barcode: string, productId?: string): Promise<any> {
    return await this.request(`/receipts/${receiptId}/scan`, 'POST', { barcode, productId }, true);
  }

  async closeReceipt(receiptId: string, reason: string): Promise<any> {
    return await this.request(`/receipts/${receiptId}/close`, 'POST', { reason }, true);
  }
}

export const posApi = new PosApiClient();
