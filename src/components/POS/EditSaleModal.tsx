import React, { useState } from 'react';
import { X, Save, User, Calendar, CreditCard, Phone, Package, DollarSign, Loader2, FileText } from 'lucide-react';
import { PointOfSale, POSItem } from '../../types';
import { posService } from '../../services/posService';
import toast from 'react-hot-toast';

interface EditSaleModalProps {
  sale: PointOfSale;
  onClose: () => void;
  onUpdate: () => void;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose, onUpdate }) => {
  // Inicializar fecha local
  const initialDate = new Date(sale.date || sale.createdAt);
  const tzOffset = initialDate.getTimezoneOffset() * 60000;
  const initialDateStr = !isNaN(initialDate.getTime())
    ? new Date(initialDate.getTime() - tzOffset).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const [dateStr, setDateStr] = useState(initialDateStr);
  const [customerName, setCustomerName] = useState(sale.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(sale.customerEmail || '');
  const [customerCedula, setCustomerCedula] = useState((sale as any).customerCedula || '');
  const [customerAddress, setCustomerAddress] = useState(sale.customerAddress || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mixed'>(sale.paymentMethod || 'cash');
  const [createdBy, setCreatedBy] = useState(sale.createdBy || 'Asesor');
  const [notes, setNotes] = useState(sale.notes || '');

  // Ítems editables
  const [items, setItems] = useState<POSItem[]>(sale.items || []);
  const [loading, setLoading] = useState(false);

  // Modificar precio de un ítem
  const handleItemPriceChange = (index: number, newPriceStr: string) => {
    const newPrice = parseFloat(newPriceStr) || 0;
    const updated = items.map((it, idx) => {
      if (idx === index) {
        return {
          ...it,
          unitPrice: newPrice,
          totalPrice: newPrice * it.quantity
        };
      }
      return it;
    });
    setItems(updated);
  };

  // Modificar cantidad de un ítem
  const handleItemQtyChange = (index: number, newQtyStr: string) => {
    const qty = parseInt(newQtyStr, 10) || 1;
    const updated = items.map((it, idx) => {
      if (idx === index) {
        return {
          ...it,
          quantity: Math.max(1, qty),
          totalPrice: it.unitPrice * Math.max(1, qty)
        };
      }
      return it;
    });
    setItems(updated);
  };

  // Recalcular total
  const calculatedTotal = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const parsedDate = dateStr ? new Date(dateStr) : new Date();

      await posService.updateSale(sale.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        customerCedula: customerCedula.trim(),
        paymentMethod,
        createdBy: createdBy.trim(),
        notes: notes.trim(),
        date: parsedDate,
        items,
        subtotal: calculatedTotal,
        total: calculatedTotal
      } as any);

      toast.success('Venta modificada exitosamente');
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-5 shrink-0 flex justify-between items-center shadow-md">
          <div>
            <h3 className="text-xl font-black">Editar Venta {sale.saleNumber}</h3>
            <p className="text-xs text-indigo-100">Modifica precios, productos, cliente o fecha de esta venta</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario scrollable */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">

          {/* Fecha y Hora */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              Fecha y Hora de la Venta:
            </label>
            <input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Perfumes / Ítems Vendidos y Precios */}
          <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Perfumes en la Venta ({items.length})
              </span>
              <span className="font-mono font-black text-indigo-600 text-sm">
                Total: ${calculatedTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{it.product?.name || 'Perfume'}</p>
                    <p className="text-[10px] text-slate-400">
                      Cant: {it.quantity} ud(s) | Subtotal: <strong className="text-slate-700">${it.totalPrice?.toFixed(2)}</strong>
                    </p>
                  </div>

                  {/* Edición de precio unitario */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Precio Unit ($):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.unitPrice}
                        onChange={e => handleItemPriceChange(idx, e.target.value)}
                        className="w-20 px-2 py-1 bg-slate-50 border border-indigo-200 font-bold font-mono text-indigo-900 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Cant:</span>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={e => handleItemQtyChange(idx, e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 font-bold font-mono text-slate-800 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Datos del Cliente
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Nombre Completo *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Cédula / RUC</label>
                <input
                  type="text"
                  value={customerCedula}
                  onChange={(e) => setCustomerCedula(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Teléfono</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-0.5">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Método de Pago y Vendedora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Método de Pago</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'cash', label: 'Efectivo', Icon: DollarSign },
                  { value: 'card', label: 'Tarjeta', Icon: CreditCard },
                  { value: 'transfer', label: 'Transf.', Icon: Phone }
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value as any)}
                    className={`p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all font-bold text-[10px] ${
                      paymentMethod === value
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 mb-0.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Vendedora Responsable</label>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Vilma, Maria, Admin..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Observaciones / Notas:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 resize-none"
            />
          </div>

          {/* Footer de Acciones */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px]">Nuevo Total:</span>
              <span className="text-lg font-black text-slate-900 font-mono">${calculatedTotal.toFixed(2)}</span>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-black transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Guardar Cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSaleModal;
