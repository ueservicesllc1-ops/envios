import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Seller, ExitNote, PaymentNote } from '../types';

export const generateSellerBalancePDF = (
    seller: Seller,
    receivedExitNotes: ExitNote[],
    paymentNotes: PaymentNote[],
    historicDebt: number,
    totalPayments: number,
    currentDebt: number
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Encabezado ---
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Estado de Cuenta Vendedor', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 30, { align: 'center' });

    // --- Información del Vendedor ---
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Información del Vendedor:', 14, 45);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${seller.name}`, 14, 52);
    doc.text(`Email: ${seller.email}`, 14, 57);
    doc.text(`Teléfono: ${seller.phone}`, 14, 62);

    // --- Resumen Financiero ---
    const startY = 75;

    doc.setFillColor(240, 240, 240);
    doc.rect(14, startY - 5, pageWidth - 28, 25, 'F');

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen Financiero', 14, startY + 5);

    doc.setFontSize(11);
    doc.text(`Deuda Histórica: $${historicDebt.toLocaleString()}`, 14, startY + 15);
    doc.text(`Pagos Realizados: $${totalPayments.toLocaleString()}`, 80, startY + 15);

    doc.setFontSize(12);
    if (currentDebt > 0) {
        doc.setTextColor(220, 53, 69); // Rojo
    } else {
        doc.setTextColor(40, 167, 69); // Verde
    }
    doc.text(`Deuda Actual: $${currentDebt.toLocaleString()}`, 150, startY + 15);

    // --- Tabla de Notas de Salida Recibidas ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Detalle de Deuda (Notas Recibidas)', 14, startY + 35);

    const exitNotesData = receivedExitNotes.map(note => [
        note.number,
        format(new Date(note.date), 'dd/MM/yyyy'),
        note.items.length,
        `$${note.totalPrice.toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: startY + 40,
        head: [['Número', 'Fecha', 'Items', 'Total']],
        body: exitNotesData,
        headStyles: { fillColor: [66, 133, 244] }, // Azul Google
        theme: 'striped',
        foot: [['TOTAL', '', '', `$${historicDebt.toLocaleString()}`]],
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Tabla de Pagos Realizados ---
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.text('Detalle de Pagos', 14, finalY);

    const paymentsData = paymentNotes.map(note => [
        format(new Date(note.paymentDate || note.createdAt), 'dd/MM/yyyy'),
        note.paymentMethod || 'N/A',
        note.reference || '-',
        `$${(note.totalAmount || 0).toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Fecha', 'Método', 'Ref.', 'Monto']],
        body: paymentsData,
        headStyles: { fillColor: [52, 168, 83] }, // Verde Google
        theme: 'striped',
        foot: [['TOTAL', '', '', `$${totalPayments.toLocaleString()}`]],
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
        doc.text('Generado por Sistema Envíos Ecuador', 14, doc.internal.pageSize.height - 10);
    }

    // Guardar PDF
    doc.save(`Estado_Cuenta_${seller.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
