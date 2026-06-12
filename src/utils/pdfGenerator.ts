import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Seller, ExitNote, PaymentNote, PointOfSale, SellerInventoryItem } from '../types';

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
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        showFoot: 'lastPage'
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
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        showFoot: 'lastPage'
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

export const generatePOSReceipt = async (sale: PointOfSale) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // --- Header ---
    // Load Logo
    try {
        const logoUrl = '/logo-compras-express.png';
        const img = new Image();
        img.src = logoUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const imgWidth = 60; // mm
        // Calculate height keeping aspect ratio
        const imgHeight = (img.height * imgWidth) / img.width;

        const x = (pageWidth - imgWidth) / 2;
        doc.addImage(img, 'PNG', x, 10, imgWidth, imgHeight);

    } catch (e) {
        console.error("Error loading logo", e);
        // Fallback to text
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('COMPRAS EXPRESS', pageWidth / 2, 20, { align: 'center' });
    }

    // "Ticket de Venta" below logo
    // Approximate logo height around 15-20mm usually, so 35-40 is safe Y
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Ticket de Venta', pageWidth / 2, 35, { align: 'center' });

    // --- Sale Details ---
    const dateStr = sale.date instanceof Date
        ? format(sale.date, 'dd/MM/yyyy HH:mm')
        : format(new Date(), 'dd/MM/yyyy HH:mm'); // Fallback

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Left side info
    const infoY = 50;
    doc.text(`N° Venta: ${sale.saleNumber || '----'}`, margin, infoY);
    doc.text(`Fecha: ${dateStr}`, margin, infoY + 5);

    // Right side info (Customer)
    const customerX = pageWidth / 2 + 20;
    doc.text('Datos del Cliente:', customerX, infoY);
    doc.setTextColor(80, 80, 80);
    doc.text(`${sale.customerName || 'Cliente General'}`, customerX, infoY + 5);
    if (sale.customerPhone) doc.text(`Tel: ${sale.customerPhone}`, customerX, infoY + 10);
    if (sale.customerAddress) doc.text(`Dir: ${sale.customerAddress}`, customerX, infoY + 15);

    // --- Items Table ---
    const itemsData = sale.items.map(item => [
        item.product.name,
        item.quantity.toString(),
        `$${item.unitPrice.toFixed(2)}`,
        `$${item.totalPrice.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: infoY + 25,
        head: [['Producto', 'Cant.', 'Precio', 'Total']],
        body: itemsData,
        headStyles: {
            fillColor: [63, 81, 181], // Indigo
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8
        },
        styles: {
            fontSize: 7,
            cellPadding: 2
        },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Product Name
            1: { cellWidth: 15, halign: 'center' }, // Qty
            2: { cellWidth: 25, halign: 'right' }, // Price
            3: { cellWidth: 25, halign: 'right' } // Total
        },
        theme: 'grid'
    });

    // --- Totals ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const rightColX = pageWidth - margin - 30; // Align numbers to right
    const labelColX = pageWidth - margin - 80;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Subtotal
    doc.text('Subtotal:', labelColX, finalY);
    doc.text(`$${sale.subtotal.toFixed(2)}`, rightColX, finalY, { align: 'right' });

    let currentY = finalY;

    // Discount
    if (sale.discount > 0) {
        currentY += 6;
        doc.setTextColor(220, 53, 69); // Red for discount
        doc.text('Descuento:', labelColX, currentY);
        doc.text(`-$${sale.discount.toFixed(2)}`, rightColX, currentY, { align: 'right' });
    }

    // Tax
    if (sale.tax > 0) {
        currentY += 6;
        doc.setTextColor(0, 0, 0);
        doc.text('IVA:', labelColX, currentY);
        doc.text(`$${sale.tax.toFixed(2)}`, rightColX, currentY, { align: 'right' });
    }

    // Total
    currentY += 8;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL:', labelColX, currentY);
    doc.text(`$${sale.total.toFixed(2)}`, rightColX, currentY, { align: 'right' });

    // --- Payment Details ---
    const paymentY = finalY; // Start payment info at same Y as totals but on left

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Forma de Pago:', margin, paymentY);

    const paymentMethodMap: Record<string, string> = {
        'cash': 'Efectivo',
        'card': 'Tarjeta',
        'transfer': 'Transferencia',
        'mixed': 'Mixto'
    };

    doc.setTextColor(60, 60, 60);
    doc.text(paymentMethodMap[sale.paymentMethod] || sale.paymentMethod, margin, paymentY + 5);

    if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'mixed') {
        if (sale.cashReceived) {
            doc.text(`Recibido (Efectivo): $${sale.cashReceived.toFixed(2)}`, margin, paymentY + 12);
        }
        if (sale.change && sale.change > 0) {
            doc.text(`Cambio: $${sale.change.toFixed(2)}`, margin, paymentY + 17);
        }
    }

    if (sale.paymentMethod === 'mixed') {
        let detailsY = paymentY + 12;
        if (sale.cashReceived) detailsY += 10; // offset if cash details shown

        if (sale.cardAmount && sale.cardAmount > 0) {
            doc.text(`Tarjeta: $${sale.cardAmount.toFixed(2)}`, margin, detailsY);
            detailsY += 5;
        }
        if (sale.transferAmount && sale.transferAmount > 0) {
            doc.text(`Transferencia: $${sale.transferAmount.toFixed(2)}`, margin, detailsY);
        }
    }

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const bottomY = doc.internal.pageSize.height - 15;
    doc.text('Gracias por su compra!', pageWidth / 2, bottomY, { align: 'center' });
    doc.text('Generado por Sistema Compras Express', pageWidth / 2, bottomY + 5, { align: 'center' });

    // Save
    doc.save(`Recibo_POS_${sale.saleNumber || 'Venta'}.pdf`);
};

export const generateSellerInventoryPDF = (
    seller: Seller,
    inventoryItems: SellerInventoryItem[]
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Encabezado ---
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Listado de Productos Entregados', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 30, { align: 'center' });

    // --- Información del Vendedor ---
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Información del Vendedor / Cliente:', 14, 45);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${seller.name}`, 14, 52);
    doc.text(`Email: ${seller.email || 'N/A'}`, 14, 57);
    doc.text(`Teléfono: ${seller.phone || 'N/A'}`, 14, 62);
    doc.text(`Ciudad: ${seller.city || 'N/A'}`, 14, 67);
    doc.text(`Dirección: ${seller.address || 'N/A'}`, 14, 72);

    // --- Tabla de Inventario ---
    const tableData = inventoryItems.map(item => [
        item.product.name,
        item.product.sku,
        item.product.category || 'N/A',
        item.quantity.toString(),
        `$${(item.unitPrice || 0).toFixed(2)}`,
        `$${(item.totalValue || 0).toFixed(2)}`,
        item.status === 'delivered' ? 'Entregado' : item.status === 'in-transit' ? 'En Tránsito' : 'Stock'
    ]);

    const totalQty = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalVal = inventoryItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);

    autoTable(doc, {
        startY: 80,
        head: [['Producto', 'SKU', 'Categoría', 'Cantidad', 'P. Unitario', 'Valor Total', 'Estado']],
        body: tableData,
        headStyles: { fillColor: [66, 133, 244] }, // Azul Google
        theme: 'striped',
        foot: [['TOTALES', '', '', totalQty.toString(), '', `$${totalVal.toFixed(2)}`, '']],
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        showFoot: 'lastPage'
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
    doc.save(`Productos_Entregados_${seller.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateSellerAppInventoryPDF = async (
    sellerName: string,
    items: any[]
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Precargar imágenes en base64
    const loadedImages: { [key: string]: string } = {};
    for (const item of items) {
        if (item.imageUrl && !loadedImages[item.imageUrl]) {
            try {
                const response = await fetch(item.imageUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                const base64data = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                loadedImages[item.imageUrl] = base64data;
            } catch (e) {
                console.error('Error preloading image:', item.imageUrl);
            }
        }
    }

    // --- Encabezado ---
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Inventario de Entregas', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 30, { align: 'center' });

    // --- Información del Vendedor ---
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Vendedor / Cliente:', 14, 45);

    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${sellerName}`, 14, 52);

    // --- Tabla de Inventario ---
    const tableData = items.map(item => [
        '', // Columna vacía para la imagen
        item.productName,
        item.sku || 'N/A',
        item.quantity.toString(),
        `$${item.unitPrice.toFixed(2)}`,
        `$${item.totalValue.toFixed(2)}`,
        'En Inventario'
    ]);

    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalVal = items.reduce((sum, item) => sum + item.totalValue, 0);

    autoTable(doc, {
        startY: 60,
        head: [['Foto', 'Producto', 'SKU', 'Cantidad', 'P. Unitario', 'Valor Total', 'Estado']],
        body: tableData,
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        theme: 'striped',
        styles: { 
            minCellHeight: 30, 
            valign: 'middle' 
        },
        columnStyles: {
            0: { cellWidth: 30, halign: 'center' }
        },
        foot: [['', 'TOTALES', '', totalQty.toString(), '', `$${totalVal.toFixed(2)}`, '']],
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        showFoot: 'lastPage',
        didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 0) {
                const item = items[data.row.index];
                if (item && item.imageUrl && loadedImages[item.imageUrl]) {
                    const base64data = loadedImages[item.imageUrl];
                    const dim = data.cell;
                    // Tamaño de la imagen: 25x25 para que no sea tan miniatura
                    const imgSize = 25;
                    const x = dim.x + (dim.width - imgSize) / 2;
                    const y = dim.y + (dim.height - imgSize) / 2;
                    
                    try {
                        // Determinar el formato basándose en la data base64 (suele ser image/jpeg o image/png)
                        const format = base64data.includes('image/png') ? 'PNG' : 'JPEG';
                        doc.addImage(base64data, format, x, y, imgSize, imgSize);
                    } catch (err) {
                        console.error('Error al dibujar la imagen en PDF:', err);
                    }
                }
            }
        }
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
    doc.save(`Inventario_${sellerName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
