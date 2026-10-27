import React, { useEffect, useMemo, useState } from 'react';
import { PackageCheck, Search, Plus, Minus, Send, X, Loader2 } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { localReceiptService, LocalReceipt } from '../services/localReceiptService';

interface EcuadorStock {
  productId: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  available: number;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800' },
  partial: { text: 'En recepción', cls: 'bg-blue-100 text-blue-800' },
  received: { text: 'Recibida', cls: 'bg-green-100 text-green-800' },
  closed: { text: 'Cerrada con faltantes', cls: 'bg-orange-100 text-orange-800' },
  cancelled: { text: 'Cancelada', cls: 'bg-gray-200 text-gray-600' }
};

const LocalReceipts: React.FC = () => {
  const [stock, setStock] = useState<EcuadorStock[]>([]);
  const [receipts, setReceipts] = useState<LocalReceipt[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, list] = await Promise.all([inventoryService.getAll(), localReceiptService.getAll()]);
      const map = new Map<string, EcuadorStock>();
      inv.forEach((i: any) => {
        const isEcuador = i.location === 'Bodega Ecuador';
        const arrived = i.status !== 'in-transit' && i.status !== 'pending';
        if (!isEcuador || !arrived || !(i.quantity > 0)) return;
        const prev = map.get(i.productId);
        if (prev) {
          prev.available += i.quantity;
        } else {
          map.set(i.productId, {
            productId: i.productId,
            name: i.product?.name || 'Producto',
            barcode: i.product?.barcode,
            imageUrl: i.product?.imageUrl,
            available: i.quantity
          });
        }
      });
      setStock(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setReceipts(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stock.filter(s => !q || s.name.toLowerCase().includes(q) || (s.barcode || '').includes(q));
  }, [stock, search]);

  const setQty = (s: EcuadorStock, qty: number) => {
    const q = Math.max(0, Math.min(s.available, qty));
    setCart(prev => {
      const next = { ...prev };
      if (q === 0) delete next[s.productId];
      else next[s.productId] = q;
      return next;
    });
  };

  const cartItems = stock.filter(s => cart[s.productId]);
  const totalUnits = cartItems.reduce((n, s) => n + cart[s.productId], 0);

  const submit = async () => {
    if (!cartItems.length) return;
    setSaving(true);
    try {
      await localReceiptService.create(
        cartItems.map(s => ({
          productId: s.productId,
          name: s.name,
          barcode: s.barcode,
          imageUrl: s.imageUrl,
          quantity: cart[s.productId]
        })),
        notes
      );
      setCart({});
      setNotes('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (r: LocalReceipt) => {
    if (!window.confirm(`¿Cancelar ${r.number} y devolver el stock a Bodega Ecuador?`)) return;
    await localReceiptService.cancel(r);
    await load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <PackageCheck className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos a Local</h1>
          <p className="text-sm text-gray-500">
            Elige los perfumes que pasan de Bodega Ecuador al local. El local los recibe escaneando cada código de barras.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border rounded-lg"
              placeholder="Buscar perfume o código de barras..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="py-10 text-center text-gray-400"><Loader2 className="inline animate-spin" /></div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto divide-y">
              {filtered.map(s => (
                <div key={s.productId} className="flex items-center gap-3 py-2">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">
                      Disponible: {s.available} {s.barcode ? `· ${s.barcode}` : '· sin código de barras'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 border rounded" onClick={() => setQty(s, (cart[s.productId] || 0) - 1)}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      className="w-14 text-center border rounded py-1"
                      value={cart[s.productId] || 0}
                      onChange={e => setQty(s, parseInt(e.target.value || '0', 10))}
                    />
                    <button className="p-1 border rounded" onClick={() => setQty(s, (cart[s.productId] || 0) + 1)}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {!filtered.length && <p className="py-8 text-center text-gray-400">Sin resultados en Bodega Ecuador</p>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 h-fit">
          <h2 className="font-semibold mb-3">Nota de ingreso</h2>
          {cartItems.length === 0 ? (
            <p className="text-sm text-gray-400">Agrega perfumes de la lista.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {cartItems.map(s => (
                <li key={s.productId} className="flex justify-between text-sm">
                  <span className="truncate pr-2">{s.name}</span>
                  <span className="flex items-center gap-2 font-semibold">
                    ×{cart[s.productId]}
                    <button onClick={() => setQty(s, 0)}><X className="h-4 w-4 text-red-500" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <textarea
            className="w-full border rounded p-2 text-sm mb-3"
            rows={2}
            placeholder="Notas (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button
            disabled={!cartItems.length || saving}
            onClick={submit}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar al local ({totalUnits} uds)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Historial de ingresos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Número</th>
                <th>Fecha</th>
                <th>Avance</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {receipts.map(r => {
                const exp = r.items.reduce((n, i) => n + i.expectedQty, 0);
                const rec = r.items.reduce((n, i) => n + i.receivedQty, 0);
                const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
                return (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 font-mono">{r.number}</td>
                    <td>{r.createdAt.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded">
                          <div className="h-2 bg-green-500 rounded" style={{ width: `${exp ? (rec / exp) * 100 : 0}%` }} />
                        </div>
                        {rec}/{exp}
                      </div>
                    </td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs ${st.cls}`}>{st.text}</span></td>
                    <td className="text-right">
                      {r.status === 'pending' && (
                        <button className="text-red-600 hover:underline" onClick={() => cancel(r)}>Cancelar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!receipts.length && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">Aún no hay ingresos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LocalReceipts;
