import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  runTransaction,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  PackageCheck,
  Printer,
  RefreshCw,
  ScanLine,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { getApiUrl } from '../config/api.config';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReceiptItem {
  productId: string;
  name: string;
  barcode: string;
  imageUrl?: string;
  expectedQty: number;
  receivedQty: number;
}

interface LocalReceipt {
  id: string;
  number: string;
  status: 'pending' | 'partial' | 'received' | 'closed' | 'cancelled';
  fromLocation: string;
  toLocation: string;
  items: ReceiptItem[];
  notes?: string;
  createdAt: Date;
  receivedAt?: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(t: any): Date {
  if (!t) return new Date();
  if (t.toDate) return t.toDate();
  return new Date(t);
}

function docToReceipt(id: string, d: any): LocalReceipt {
  return {
    id,
    number: d.number || id,
    status: d.status || 'pending',
    fromLocation: d.fromLocation || 'Bodega Ecuador',
    toLocation: d.toLocation || 'Tienda',
    items: (d.items || []) as ReceiptItem[],
    notes: d.notes,
    createdAt: toDate(d.createdAt),
    receivedAt: d.receivedAt ? toDate(d.receivedAt) : undefined,
  };
}

function triggerBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch { /* ignore */ }
}

function triggerHaptic() {
  try { navigator.vibrate?.(80); } catch { /* ignore */ }
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending:    { label: 'Pendiente',           color: 'text-amber-400',  dot: 'bg-amber-400'  },
  partial:    { label: 'En recepción',        color: 'text-blue-400',   dot: 'bg-blue-400'   },
  received:   { label: 'Completada',          color: 'text-emerald-400',dot: 'bg-emerald-400'},
  closed:     { label: 'Cerrada c/faltantes', color: 'text-orange-400', dot: 'bg-orange-400' },
  cancelled:  { label: 'Cancelada',           color: 'text-slate-500',  dot: 'bg-slate-500'  },
};

const printReceiptPdf = (r: LocalReceipt) => {
  const doc = new jsPDF();
  const totalExp = (r.items || []).reduce((s, i) => s + (i.expectedQty || 0), 0);
  const totalRec = (r.items || []).reduce((s, i) => s + (i.receivedQty || 0), 0);
  const stLabel = STATUS_META[r.status]?.label || r.status;

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('COMPRASEXPRESS', 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('NOTA DE ENVÍO / TRASLADO A TIENDA', 14, 25);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

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

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`TOTAL: ${(r.items || []).length} perfumes  |  ${totalExp} unidades en total`, 14, finalY + 8);

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

// ─── Scanner overlay ─────────────────────────────────────────────────────────

interface ScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const detectedRef = useRef(false);

  const stop = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function start() {
      if (!videoRef.current) return;
      try {
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!devices.length) { setError('No se detectó cámara.'); return; }

        const back = devices.find(d =>
          /back|trasera|rear|environment/i.test(d.label)
        ) || devices[devices.length - 1];

        const controls = await reader.decodeFromVideoDevice(
          back.deviceId,
          videoRef.current!,
          (result) => {
            if (!result || !mounted || detectedRef.current) return;
            const code = result.getText().trim();
            if (!code) return;
            detectedRef.current = true;
            triggerBeep();
            triggerHaptic();
            stop();
            onDetected(code);
          }
        );
        if (mounted) controlsRef.current = controls;
      } catch (e: any) {
        if (mounted) {
          setError(
            e.name === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Actívalo en ajustes del navegador.'
              : 'No se pudo iniciar la cámara. Usa el ingreso manual.'
          );
        }
      }
    }

    start();
    return () => { mounted = false; stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManual = () => {
    const c = manual.trim();
    if (!c) return;
    stop();
    onDetected(c);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Camera className="text-amber-400" size={20} />
          <span className="font-bold text-white text-sm">Escanear código de barras</span>
        </div>
        <button
          onClick={() => { stop(); onClose(); }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          autoPlay
          muted
        />
        {/* Guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative w-72 h-40"
            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTop: '4px solid #f59e0b', borderLeft: '4px solid #f59e0b', borderRadius: '12px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTop: '4px solid #f59e0b', borderRight: '4px solid #f59e0b', borderRadius: '0 12px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottom: '4px solid #f59e0b', borderLeft: '4px solid #f59e0b', borderRadius: '0 0 0 12px' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottom: '4px solid #f59e0b', borderRight: '4px solid #f59e0b', borderRadius: '0 0 12px 0' }} />
          </div>
        </div>

        {error && (
          <div className="absolute inset-x-4 bottom-32 bg-red-900/90 border border-red-500 text-red-200 rounded-2xl p-4 text-sm text-center">
            {error}
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div className="bg-[#111] border-t border-white/10 px-4 pt-4 pb-8">
        <p className="text-slate-400 text-xs mb-2 text-center">O ingresa el código manualmente:</p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={manual}
            onChange={e => setManual(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitManual()}
            placeholder="Código de barras..."
            className="flex-1 bg-[#1a1a1a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={submitManual}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition text-sm"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Toast type ───────────────────────────────────────────────────────────────

interface ToastMsg { msg: string; ok: boolean; id: number }

// ─── Main page ────────────────────────────────────────────────────────────────

const AppRecibirMercaderia: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAnonymousAuth();

  const [receipts, setReceipts] = useState<LocalReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<LocalReceipt | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Recepción manual (sin escáner)
  const [manualItem, setManualItem] = useState<ReceiptItem | null>(null);
  const [manualQty, setManualQty] = useState(1);
  const [manualPhoto, setManualPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const addToast = (msg: string, ok: boolean) => {
    const id = Date.now();
    setToasts(prev => [...prev, { msg, ok, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // ── Load receipts ──────────────────────────────────────────────────────────

  const loadReceipts = useCallback(async (currentActive?: LocalReceipt | null) => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'localReceipts'),
          where('status', 'in', ['pending', 'partial'])
        )
      );
      const list = snap.docs
        .map(d => docToReceipt(d.id, d.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setReceipts(list);

      // Refresh active receipt if open
      if (currentActive) {
        const updated = list.find(r => r.id === currentActive.id);
        setActiveReceipt(updated || null);
      }
    } catch (e) {
      console.error('Error cargando notas:', e);
      addToast('Error al cargar las notas de ingreso', false);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && user) loadReceipts(null);
  }, [authLoading, user, loadReceipts]);

  // ── Scan handler ───────────────────────────────────────────────────────────

  const handleScan = async (barcode: string) => {
    if (!activeReceipt) return;
    setShowScanner(false);
    setProcessing(true);

    try {
      // Find which item matches this barcode
      const item = activeReceipt.items.find(
        i => i.barcode && i.barcode.trim() === barcode.trim()
      );

      if (!item) {
        addToast(`Código ${barcode} no pertenece a esta nota`, false);
        setProcessing(false);
        return;
      }

      if ((item.receivedQty || 0) >= (item.expectedQty || 0)) {
        addToast(`${item.name}: ya está completo ✓`, false);
        setProcessing(false);
        return;
      }

      const receiptRef = doc(db, 'localReceipts', activeReceipt.id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(receiptRef);
        if (!snap.exists()) throw new Error('Nota no encontrada');

        const data = snap.data() as any;
        if (['received', 'cancelled', 'closed'].includes(data.status)) {
          throw new Error('La nota ya está cerrada');
        }

        const items: ReceiptItem[] = [...(data.items || [])];
        const idx = items.findIndex(i => i.barcode?.trim() === barcode.trim());
        if (idx < 0) throw new Error('Código no encontrado en la nota');

        if ((items[idx].receivedQty || 0) >= (items[idx].expectedQty || 0)) {
          throw new Error(`${items[idx].name}: ya está completo`);
        }

        items[idx] = { ...items[idx], receivedQty: (items[idx].receivedQty || 0) + 1 };
        const complete = items.every(i => (i.receivedQty || 0) >= (i.expectedQty || 0));

        // 1. Descontar 1 de Bodega Ecuador al momento de ser recibido y escaneado
        const ecuadorInvQ = query(
          collection(db, 'inventory'),
          where('productId', '==', item.productId),
          where('location', '==', data.fromLocation || 'Bodega Ecuador')
        );
        const ecuadorInvSnap = await getDocs(ecuadorInvQ);
        if (!ecuadorInvSnap.empty) {
          const ecuadorDoc = ecuadorInvSnap.docs[0];
          const ecuadorData = ecuadorDoc.data() as any;
          const currentEcuQty = Number(ecuadorData.quantity) || 0;
          tx.update(ecuadorDoc.ref, {
            quantity: Math.max(0, currentEcuQty - 1),
            lastUpdated: Timestamp.now(),
          });
        }

        // 2. Sumar 1 al inventario del destino (Tienda)
        const invQ = query(
          collection(db, 'inventory'),
          where('productId', '==', item.productId),
          where('location', '==', data.toLocation || 'Bodega Principal')
        );
        const invSnap = await getDocs(invQ);

        const prodSnap = await getDoc(doc(db, 'products', item.productId));
        const prod: any = prodSnap.exists() ? prodSnap.data() : {};
        const cost = Number(prod.cost) || 0;
        const unitPrice = Number(prod.salePrice1) || 0;

        if (!invSnap.empty) {
          const invDoc = invSnap.docs[0];
          const inv = invDoc.data() as any;
          tx.update(invDoc.ref, {
            quantity: (Number(inv.quantity) || 0) + 1,
            totalCost: (Number(inv.totalCost) || 0) + cost,
            totalValue: (Number(inv.totalCost) || 0) + cost,
            totalPrice: (Number(inv.totalPrice) || 0) + unitPrice,
            status: 'stock',
            lastUpdated: Timestamp.now(),
          });
        } else {
          const newRef = doc(collection(db, 'inventory'));
          tx.set(newRef, {
            productId: item.productId,
            product: {
              id: item.productId,
              name: item.name,
              barcode: item.barcode,
              imageUrl: item.imageUrl || '',
              ...prod
            },
            quantity: 1,
            cost,
            unitPrice,
            totalCost: cost,
            totalPrice: unitPrice,
            totalValue: cost,
            location: data.toLocation || 'Bodega Principal',
            status: 'stock',
            lastUpdated: Timestamp.now(),
          });
        }

        const update: any = {
          items,
          status: complete ? 'received' : 'partial',
        };
        if (complete) {
          update.receivedAt = Timestamp.now();
        }
        tx.update(receiptRef, update);
      });

      addToast(`✓ ${item.name} recibido al inventario`, true);
      await loadReceipts(activeReceipt);
    } catch (e: any) {
      addToast(e.message || 'Error al procesar el escaneo', false);
    } finally {
      setProcessing(false);
    }
  };

  // ── Manual receive (foto de evidencia -> B2) ───────────────────────────────

  const openManual = (item: ReceiptItem) => {
    const remaining = (item.expectedQty || 0) - (item.receivedQty || 0);
    if (remaining <= 0) return;
    setManualItem(item);
    setManualQty(1);
    setManualPhoto(null);
  };

  const closeManual = () => {
    if (processing) return;
    setManualItem(null);
    setManualPhoto(null);
  };

  // Reduce la foto (máx 1280px, JPEG 0.8) para subirla rápido desde el celular
  const onPhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setManualPhoto(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const confirmManual = async () => {
    if (!activeReceipt || !manualItem || !manualPhoto) return;
    const item = manualItem;
    const qty = manualQty;
    setProcessing(true);
    try {
      // 1. Guardar la foto de evidencia en B2
      const resp = await fetch(getApiUrl('/api/b2/upload-receipt-photo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: manualPhoto,
          receiptNumber: activeReceipt.number,
          productId: item.productId,
        }),
      });
      const up = await resp.json();
      if (!resp.ok || !up.success) throw new Error(up.error || 'No se pudo guardar la foto');

      // 2. Aplicar recepción y mover stock
      const receiptRef = doc(db, 'localReceipts', activeReceipt.id);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(receiptRef);
        if (!snap.exists()) throw new Error('Nota no encontrada');
        const data = snap.data() as any;
        if (['received', 'cancelled', 'closed'].includes(data.status)) {
          throw new Error('La nota ya está cerrada');
        }

        const items: ReceiptItem[] = [...(data.items || [])];
        const idx = items.findIndex(i => i.productId === item.productId);
        if (idx < 0) throw new Error('Perfume no encontrado en la nota');
        const pending = (items[idx].expectedQty || 0) - (items[idx].receivedQty || 0);
        if (qty > pending) throw new Error(`Solo faltan ${pending} por recibir`);

        items[idx] = { ...items[idx], receivedQty: (items[idx].receivedQty || 0) + qty };
        const complete = items.every(i => (i.receivedQty || 0) >= (i.expectedQty || 0));

        // Descontar de Bodega Ecuador (registro con stock suficiente)
        const ecuSnap = await getDocs(query(
          collection(db, 'inventory'),
          where('productId', '==', item.productId),
          where('location', '==', data.fromLocation || 'Bodega Ecuador')
        ));
        const ecuDoc = ecuSnap.docs.find(d => (Number((d.data() as any).quantity) || 0) >= qty) || ecuSnap.docs[0];
        if (ecuDoc) {
          const ed = ecuDoc.data() as any;
          const eq = Number(ed.quantity) || 0;
          const unitCost = eq > 0 ? (Number(ed.totalCost) || 0) / eq : 0;
          const unitTot = eq > 0 ? (Number(ed.totalPrice) || 0) / eq : 0;
          const newQ = Math.max(0, eq - qty);
          tx.update(ecuDoc.ref, {
            quantity: newQ,
            totalCost: Math.max(0, (Number(ed.totalCost) || 0) - unitCost * qty),
            totalValue: Math.max(0, (Number(ed.totalCost) || 0) - unitCost * qty),
            totalPrice: Math.max(0, (Number(ed.totalPrice) || 0) - unitTot * qty),
            lastUpdated: Timestamp.now(),
          });
        }

        // Sumar al destino (Tienda)
        const destSnap = await getDocs(query(
          collection(db, 'inventory'),
          where('productId', '==', item.productId),
          where('location', '==', data.toLocation || 'Bodega Principal')
        ));
        const prodSnap = await getDoc(doc(db, 'products', item.productId));
        const prod: any = prodSnap.exists() ? prodSnap.data() : {};
        const cost = Number(prod.cost) || 0;
        const unitPrice = Number(prod.salePrice1) || 0;

        if (!destSnap.empty) {
          const dd = destSnap.docs[0];
          const inv = dd.data() as any;
          tx.update(dd.ref, {
            quantity: (Number(inv.quantity) || 0) + qty,
            totalCost: (Number(inv.totalCost) || 0) + cost * qty,
            totalValue: (Number(inv.totalCost) || 0) + cost * qty,
            totalPrice: (Number(inv.totalPrice) || 0) + unitPrice * qty,
            status: 'stock',
            lastUpdated: Timestamp.now(),
          });
        } else {
          tx.set(doc(collection(db, 'inventory')), {
            productId: item.productId,
            product: {
              id: item.productId,
              name: item.name,
              barcode: item.barcode,
              imageUrl: item.imageUrl || '',
              ...prod,
            },
            quantity: qty,
            cost,
            unitPrice,
            totalCost: cost * qty,
            totalPrice: unitPrice * qty,
            totalValue: cost * qty,
            location: data.toLocation || 'Bodega Principal',
            status: 'stock',
            lastUpdated: Timestamp.now(),
          });
        }

        const update: any = {
          items,
          status: complete ? 'received' : 'partial',
          manualReceipts: [
            ...(data.manualReceipts || []),
            {
              productId: item.productId,
              name: item.name,
              quantity: qty,
              photoUrl: up.url,
              photoPath: up.path,
              at: Timestamp.now(),
              method: 'manual',
            },
          ],
        };
        if (complete) update.receivedAt = Timestamp.now();
        tx.update(receiptRef, update);
      });

      triggerBeep();
      triggerHaptic();
      addToast(`✓ ${item.name} ×${qty} recibido (foto guardada)`, true);
      setManualItem(null);
      setManualPhoto(null);
      await loadReceipts(activeReceipt);
    } catch (e: any) {
      addToast(e.message || 'Error al recibir manualmente', false);
    } finally {
      setProcessing(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  const expectedTotal = activeReceipt?.items.reduce((s, i) => s + (i.expectedQty || 0), 0) ?? 0;
  const receivedTotal = activeReceipt?.items.reduce((s, i) => s + (i.receivedQty || 0), 0) ?? 0;
  const progressPct = expectedTotal > 0 ? Math.round((receivedTotal / expectedTotal) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D12] flex items-center justify-center">
        <Loader2 className="text-amber-400 animate-spin" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D12] text-white flex flex-col select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Toasts ── */}
      <div className="fixed top-4 inset-x-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold border backdrop-blur-sm ${
              t.ok
                ? 'bg-emerald-900/95 border-emerald-500/50 text-emerald-200'
                : 'bg-red-900/95 border-red-500/50 text-red-200'
            }`}
            style={{ animation: 'slideDown 0.3s ease' }}
          >
            {t.ok
              ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              : <X size={16} className="text-red-400 shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── Scanner ── */}
      {showScanner && (
        <Scanner
          onDetected={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-[#0A0D12]/95 backdrop-blur-md border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => activeReceipt ? setActiveReceipt(null) : navigate('/app')}
          className="p-2 rounded-xl bg-white/8 hover:bg-white/14 text-slate-300 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black tracking-tight text-white truncate">
            {activeReceipt ? `Nota ${activeReceipt.number}` : 'Recibir Mercadería'}
          </h1>
          <p className="text-xs text-slate-500 truncate">
            {activeReceipt
              ? `${activeReceipt.fromLocation} → ${activeReceipt.toLocation}`
              : 'Notas pendientes de recibir en tienda'}
          </p>
        </div>

        {activeReceipt && (
          <button
            onClick={() => printReceiptPdf(activeReceipt)}
            className="p-2 rounded-xl bg-white/8 hover:bg-white/14 text-slate-300 hover:text-blue-400 transition"
            title="Imprimir nota en PDF"
          >
            <Printer size={18} />
          </button>
        )}

        <button
          onClick={() => loadReceipts(activeReceipt)}
          disabled={loading}
          className="p-2 rounded-xl bg-white/8 hover:bg-white/14 text-slate-400 hover:text-amber-400 transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin text-amber-400' : ''} />
        </button>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 px-4 py-4 pb-10">

        {/* LIST VIEW */}
        {!activeReceipt && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="animate-spin text-amber-400" size={32} />
                <p className="text-slate-500 text-sm">Cargando notas...</p>
              </div>
            ) : receipts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
                <div className="w-20 h-20 rounded-3xl bg-[#181B20] border border-white/8 flex items-center justify-center">
                  <PackageCheck className="text-slate-600" size={36} />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Sin notas pendientes</p>
                  <p className="text-slate-500 text-sm mt-1">
                    Cuando el administrador envíe productos desde Bodega Ecuador, aparecerán aquí.
                  </p>
                </div>
                <button
                  onClick={() => loadReceipts(null)}
                  className="mt-2 px-5 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-amber-500/30 transition"
                >
                  <RefreshCw size={15} /> Actualizar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold px-1 mb-3">
                  {receipts.length} nota{receipts.length !== 1 ? 's' : ''} pendiente{receipts.length !== 1 ? 's' : ''}
                </p>

                {receipts.map(r => {
                  const exp = r.items.reduce((s, i) => s + (i.expectedQty || 0), 0);
                  const rec = r.items.reduce((s, i) => s + (i.receivedQty || 0), 0);
                  const pct = exp > 0 ? Math.round((rec / exp) * 100) : 0;
                  const meta = STATUS_META[r.status] || STATUS_META.pending;

                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveReceipt(r)}
                      className="w-full text-left bg-[#13161C] hover:bg-[#181B23] border border-white/8 hover:border-amber-500/30 rounded-2xl p-4 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-10 h-10 rounded-xl bg-[#1E222A] border border-white/8 flex items-center justify-center shrink-0">
                          <Package size={18} className="text-amber-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold text-sm">{r.number}</span>
                            <span className={`flex items-center gap-1 text-xs font-semibold ${meta.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full inline-block ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </div>

                          <p className="text-slate-400 text-xs truncate">
                            {r.items.length} perfume{r.items.length !== 1 ? 's' : ''} · {r.fromLocation}
                          </p>

                          <div className="mt-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">{rec} de {exp} unidades</span>
                              <span className="text-xs font-bold text-amber-400">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-[#1E222A] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
                                }}
                              />
                            </div>
                          </div>

                          <p className="text-slate-600 text-xs mt-2 flex items-center gap-1">
                            <Clock size={11} />
                            {r.createdAt.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        <ChevronRight size={18} className="text-slate-600 shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* DETAIL VIEW */}
        {activeReceipt && (
          <div className="space-y-4">

            {/* Progress card */}
            <div className="bg-[#13161C] border border-white/8 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Progreso de recepción</span>
                <span className="text-2xl font-black" style={{ color: progressPct === 100 ? '#34d399' : '#f59e0b' }}>
                  {progressPct}%
                </span>
              </div>
              <div className="h-3 bg-[#1E222A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? 'linear-gradient(to right, #10b981, #34d399)'
                      : 'linear-gradient(to right, #f59e0b, #fbbf24)',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{receivedTotal} recibidas</span>
                <span>{expectedTotal} esperadas</span>
              </div>
            </div>

            {/* Scan button */}
            {activeReceipt.status !== 'received' ? (
              <button
                onClick={() => setShowScanner(true)}
                disabled={processing}
                className="w-full py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
                  color: '#000',
                  boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ScanLine size={22} />
                    Recibir — Escanear código
                  </>
                )}
              </button>
            ) : (
              <div className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-emerald-900/40 border border-emerald-500/40 text-emerald-400">
                <CheckCircle2 size={20} />
                Nota completamente recibida ✓
              </div>
            )}

            <button
              onClick={() => printReceiptPdf(activeReceipt)}
              className="w-full py-3 rounded-xl bg-[#181B22] hover:bg-[#1E232E] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Printer size={15} /> Imprimir lista de traslado ({activeReceipt.items?.length || 0} perfumes / {expectedTotal} uds)
            </button>

            {/* Items list */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold px-1">
                Perfumes — {activeReceipt.items.length} item{activeReceipt.items.length !== 1 ? 's' : ''}
              </p>

              {activeReceipt.items.map((item, idx) => {
                const done = (item.receivedQty || 0) >= (item.expectedQty || 0);
                const remaining = (item.expectedQty || 0) - (item.receivedQty || 0);

                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => !done && openManual(item)}
                    className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                      done
                        ? 'bg-emerald-900/20 border-emerald-500/25 opacity-80 cursor-default'
                        : 'bg-[#13161C] border-white/8 hover:border-amber-500/40 active:scale-[0.99]'
                    }`}
                  >
                    {/* Image */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#1E222A] border border-white/8 shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Package size={20} className="text-slate-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${done ? 'text-emerald-300' : 'text-white'}`}>
                        {item.name}
                      </p>
                      {item.barcode && (
                        <p className="text-slate-500 text-xs font-mono truncate mt-0.5">
                          {item.barcode}
                        </p>
                      )}
                    </div>

                    {/* Qty badge */}
                    <div className="text-right shrink-0">
                      {done ? (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 size={16} />
                          <span className="font-black text-sm">{item.receivedQty}/{item.expectedQty}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-black text-white text-sm">
                            {item.receivedQty || 0}
                            <span className="text-slate-500">/{item.expectedQty}</span>
                          </span>
                          <p className="text-amber-400 text-xs font-semibold mt-0.5">
                            {remaining} pend.
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeReceipt.notes && (
              <div className="bg-[#13161C] border border-white/8 rounded-xl p-3 text-slate-400 text-xs">
                <span className="font-semibold text-slate-300">Notas: </span>
                {activeReceipt.notes}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal recepción manual ── */}
      {manualItem && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white font-bold text-sm truncate pr-2">Recibir manualmente</span>
            <button
              onClick={closeManual}
              disabled={processing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
            <div className="w-full bg-[#13161C] rounded-2xl overflow-hidden flex items-center justify-center" style={{ minHeight: 240 }}>
              {manualItem.imageUrl ? (
                <img src={manualItem.imageUrl} alt={manualItem.name} className="w-full max-h-[50vh] object-contain" />
              ) : (
                <Package size={64} className="text-slate-600" />
              )}
            </div>

            <div>
              <p className="text-white font-bold text-lg leading-tight">{manualItem.name}</p>
              {manualItem.barcode && <p className="text-slate-500 text-xs font-mono mt-1">{manualItem.barcode}</p>}
              <p className="text-amber-400 text-sm font-semibold mt-1">
                Pendientes: {(manualItem.expectedQty || 0) - (manualItem.receivedQty || 0)} de {manualItem.expectedQty}
              </p>
            </div>

            {/* Cantidad */}
            <div className="bg-[#13161C] border border-white/8 rounded-2xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3 text-center">Cantidad recibida</p>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setManualQty(q => Math.max(1, q - 1))}
                  className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95"
                >
                  <Minus size={20} />
                </button>
                <span className="text-4xl font-black text-white w-16 text-center">{manualQty}</span>
                <button
                  onClick={() => setManualQty(q => Math.min((manualItem.expectedQty || 0) - (manualItem.receivedQty || 0), q + 1))}
                  className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center active:scale-95"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Foto evidencia */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoPicked}
              className="hidden"
            />
            {manualPhoto ? (
              <div className="space-y-2">
                <img src={manualPhoto} alt="Evidencia" className="w-full max-h-64 object-contain rounded-2xl border border-emerald-500/40 bg-black" />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={processing}
                  className="w-full py-2.5 rounded-xl bg-white/10 text-slate-200 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Camera size={16} /> Volver a tomar foto
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-amber-500/50 text-amber-400 font-bold flex items-center justify-center gap-2 active:scale-95"
              >
                <Camera size={20} /> Tomar foto del producto recibido
              </button>
            )}
          </div>

          <div className="px-4 pb-6 pt-2 bg-[#0A0D12] border-t border-white/10">
            <button
              onClick={confirmManual}
              disabled={!manualPhoto || processing}
              className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition"
              style={{ background: 'linear-gradient(to right, #10b981, #34d399)', color: '#04120c' }}
            >
              {processing ? (
                <><Loader2 className="animate-spin" size={20} /> Guardando...</>
              ) : (
                <><CheckCircle2 size={20} /> Recibir este producto ({manualQty})</>
              )}
            </button>
            {!manualPhoto && (
              <p className="text-center text-xs text-slate-500 mt-2">La foto es obligatoria como comprobante.</p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AppRecibirMercaderia;
