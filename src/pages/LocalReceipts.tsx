import React, { useEffect, useMemo, useState } from 'react';
import { PackageCheck, Search, Plus, Minus, Send, X, Loader2, Eye, Printer, Download, CheckCircle2, Package, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [selectedReceipt, setSelectedReceipt] = useState<LocalReceipt | null>(null);
  const [modalSearch, setModalSearch] = useState('');

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

  const printReceiptPdf = (r: LocalReceipt) => {
    const doc = new jsPDF();
    const totalExp = (r.items || []).reduce((s, i) => s + (i.expectedQty || 0), 0);
    const totalRec = (r.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
    const stLabel = STATUS_LABEL[r.status]?.text || r.status;

    // Header
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('COMPRASEXPRESS', 14, 18);

    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text('NOTA DE ENVÍO / TRASLADO A TIENDA', 14, 25);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    // Meta box
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const leftX = 14;
    const rightX = 110;

    doc.text(`N° de Nota: ${r.number}`, leftX, 35);
    doc.text(`Fecha: ${r.createdAt ? new Date(r.createdAt).toLocaleString('es-EC') : '—'}`, leftX, 40);
    doc.text(`Origen: ${r.fromLocation || 'Bodega Ecuador'}`, leftX, 45);
    doc.text(`Destino: ${r.toLocation || 'Tienda / Local'}`, leftX, 50);

    doc.text(`Estado: ${stLabel.toUpperCase()}`, rightX, 35);
    doc.text(`Variedad de perfumes: ${(r.items || []).length} items`, rightX, 40);
    doc.text(`Total unidades enviadas: ${totalExp}`, rightX, 45);
    doc.text(`Total unidades recibidas: ${totalRec}`, rightX, 50);

    let startTableY = 56;
    if (r.notes) {
      doc.text(`Notas: ${r.notes}`, leftX, 55);
      startTableY = 62;
    }

    const rows = (r.items || []).map((item, idx) => [
      String(idx + 1),
      item.name || 'Sin nombre',
      item.barcode || '—',
      String(item.expectedQty || 0),
      String(item.receivedQty || 0),
      (item.receivedQty || 0) >= (item.expectedQty || 0) ? 'RECIBIDO' : 'PENDIENTE'
    ]);

    autoTable(doc, {
      startY: startTableY,
      head: [['#', 'Perfume / Producto', 'Código de Barras', 'Cant. Env.', 'Cant. Rec.', 'Estado']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 85 },
        2: { cellWidth: 42, font: 'courier' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 24, halign: 'center' }
      }
    });

    const finalY = ((doc as any).lastAutoTable?.finalY as number) || (startTableY + 40);

    // Summary below table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL: ${(r.items || []).length} perfumes  |  ${totalExp} unidades en total`, 14, finalY + 8);

    // Signatures
    const signY = finalY > 235 ? 245 : Math.max(finalY + 28, 235);
    if (finalY > 235) {
      doc.addPage();
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.line(20, signY, 85, signY);
    doc.text('Entregado por (Bodega Ecuador)', 22, signY + 5);

    doc.line(125, signY, 190, signY);
    doc.text('Recibido por (Tienda / Local)', 130, signY + 5);

    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  };

  const filteredModalItems = useMemo(() => {
    if (!selectedReceipt) return [];
    const q = modalSearch.trim().toLowerCase();
    return (selectedReceipt.items || []).filter(
      i => !q || i.name.toLowerCase().includes(q) || (i.barcode || '').includes(q)
    );
  }, [selectedReceipt, modalSearch]);

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg text-gray-900">Historial de envíos a tienda</h2>
          <span className="text-xs text-gray-500">{receipts.length} notas registradas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2.5 px-3">Número</th>
                <th className="px-3">Fecha</th>
                <th className="px-3">Perfumes / Total</th>
                <th className="px-3">Avance</th>
                <th className="px-3">Estado</th>
                <th className="px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map(r => {
                const exp = (r.items || []).reduce((n, i) => n + (i.expectedQty || 0), 0);
                const rec = (r.items || []).reduce((n, i) => n + (i.receivedQty || 0), 0);
                const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
                const pct = exp > 0 ? Math.round((rec / exp) * 100) : 0;

                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => { setSelectedReceipt(r); setModalSearch(''); }}
                        className="font-mono font-bold text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-1.5"
                      >
                        <Package size={15} />
                        {r.number}
                      </button>
                    </td>
                    <td className="px-3 text-gray-600">{r.createdAt.toLocaleString()}</td>
                    <td className="px-3">
                      <span className="font-semibold text-gray-800">{(r.items || []).length} perfumes</span>
                      <span className="text-xs text-gray-500 ml-1">({exp} uds)</span>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{rec}/{exp}</span>
                        <span className="text-xs text-gray-400">({pct}%)</span>
                      </div>
                    </td>
                    <td className="px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                        {st.text}
                      </span>
                    </td>
                    <td className="px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setSelectedReceipt(r); setModalSearch(''); }}
                          className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1 transition"
                          title="Ver listado de productos"
                        >
                          <Eye size={13} /> Ver lista
                        </button>
                        <button
                          onClick={() => printReceiptPdf(r)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center gap-1 transition"
                          title="Imprimir o descargar PDF"
                        >
                          <Printer size={13} /> Imprimir
                        </button>
                        {r.status === 'pending' && (
                          <button
                            onClick={() => cancel(r)}
                            className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition"
                            title="Cancelar nota y reponer a bodega"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!receipts.length && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Aún no hay notas de ingreso</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE DE PRODUCTOS E IMPRESIÓN */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">
                    Nota {selectedReceipt.number}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_LABEL[selectedReceipt.status]?.cls || 'bg-gray-100'}`}>
                    {STATUS_LABEL[selectedReceipt.status]?.text || selectedReceipt.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span>De: <b>{selectedReceipt.fromLocation}</b></span>
                  <span>→</span>
                  <span>A: <b>{selectedReceipt.toLocation}</b></span>
                  <span>·</span>
                  <Clock size={12} className="inline" />
                  <span>{selectedReceipt.createdAt?.toLocaleString()}</span>
                </p>
                {selectedReceipt.notes && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 inline-block">
                    <b>Notas:</b> {selectedReceipt.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => printReceiptPdf(selectedReceipt)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Printer size={16} /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Summary bar & search */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Total productos: </span>
                  <span className="font-bold text-gray-900">{selectedReceipt.items?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Unidades enviadas: </span>
                  <span className="font-bold text-gray-900">
                    {(selectedReceipt.items || []).reduce((s, i) => s + (i.expectedQty || 0), 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Unidades recibidas: </span>
                  <span className="font-bold text-emerald-600">
                    {(selectedReceipt.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0)}
                  </span>
                </div>
              </div>

              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en esta lista..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Modal Items List */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="divide-y divide-gray-100">
                {filteredModalItems.map((item, idx) => {
                  const done = (item.receivedQty || 0) >= (item.expectedQty || 0);
                  const remaining = (item.expectedQty || 0) - (item.receivedQty || 0);

                  return (
                    <div key={idx} className="py-2.5 flex items-center gap-3 hover:bg-gray-50 px-2 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package size={18} className="text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          {item.barcode ? `Código: ${item.barcode}` : 'Sin código de barras'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm font-bold text-gray-900">
                            {item.receivedQty || 0} / {item.expectedQty}
                          </span>
                          {done ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Completo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                              {remaining} pend.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!filteredModalItems.length && (
                  <p className="py-8 text-center text-gray-400 text-sm">
                    No se encontraron perfumes con ese criterio.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Mostrando {filteredModalItems.length} de {selectedReceipt.items?.length || 0} perfumes
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => printReceiptPdf(selectedReceipt)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition"
                >
                  <Printer size={16} /> Imprimir Nota (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalReceipts;
