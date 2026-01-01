// EJEMPLO DE INTEGRACIÓN EN CARTPAGE.TSX
// Copia este código en tu CartPage donde se completa el pago

import { emailService } from '../services/emailService';
import { format, addDays } from 'date-fns';

// 1. Agregar este import al principio del archivo (línea ~20)
// import { emailService } from '../services/emailService';

// 2. Dentro de tu función de procesamiento de pago (ejemplo con PayPal onApprove):
const procesarPagoExitoso = async (transactionId?: string) => {
    try {
        // Generar número de orden y código de seguridad
        const orderNumber = `CE-${Date.now()}`;
        const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Crear la venta en Firestore (tu código existente)
        await onlineSaleService.create({
            number: orderNumber,
            items: cart.map(item => ({
                productId: item.id,
                productName: item.name,
                productSku: item.sku || '',
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
                imageUrl: item.imageUrl
            })),
            totalAmount: totalWithShipping,
            shippingCost: shippingCost,
            customerName: user?.displayName || '',
            customerEmail: user?.email || '',
            customerPhone: selectedAddress?.phone || '',
            customerAddress: selectedAddress?.address || '',
            status: 'confirmed',
            paymentMethod: 'paypal',
            paypalTransactionId: transactionId,
            notes: '',
            createdAt: new Date(),
            securityCode: securityCode // ← Importante: guarda el código
        });

        // 🎯 ENVIAR EMAIL DE CONFIRMACIÓN
        if (user?.email) {
            await emailService.sendCompraExitosa({
                customerName: user.displayName || 'Cliente',
                customerEmail: user.email,
                orderNumber: orderNumber,
                securityCode: securityCode,
                totalAmount: totalWithShipping,
                items: cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                deliveryAddress: selectedAddress
                    ? `${selectedAddress.address}, ${selectedAddress.city}, ${selectedAddress.province}`
                    : 'Retiro en tienda',
                estimatedDate: format(addDays(new Date(), 7), 'dd/MM/yyyy')
            });
        }

        // Limpiar carrito
        clearCart();

        // Navegar a página de éxito
        navigate('/order-success', {
            state: {
                orderNumber: orderNumber,
                securityCode: securityCode
            }
        });

        toast.success('¡Compra exitosa! Revisa tu email para más detalles');
    } catch (error) {
        console.error('Error procesando pago:', error);
        toast.error('Error al procesar el pago');
    }
};

// 3. EJEMPLO: Integración en PayPalButtons
/*
<PayPalButtons
    createOrder={...}
    onApprove={async (data, actions) => {
        if (actions.order) {
            try {
                const details = await actions.order.capture();
                await procesarPagoExitoso(details.id); // ← Llama a la función aquí
            } catch (error) {
                console.error('Error:', error);
                toast.error('Error al procesar el pago de PayPal');
            }
        }
    }}
    onError={(err) => {
        console.error('PayPal Error:', err);
        toast.error('Error en PayPal');
    }}
/>
*/

// 4. EJEMPLO: Para pagos con transferencia bancaria
/*
const finalizarPedidoTransferencia = async () => {
    setProcessingSale(true);
    
    try {
        const orderNumber = `CE-${Date.now()}`;
        const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Subir comprobante a Firebase Storage
        let receiptUrl = '';
        if (receiptFile) {
            const receiptRef = ref(storage, `receipts/${orderNumber}-${receiptFile.name}`);
            await uploadBytes(receiptRef, receiptFile);
            receiptUrl = await getDownloadURL(receiptRef);
        }

        // Crear venta
        await onlineSaleService.create({
            number: orderNumber,
            // ... resto de datos
            status: 'pending', // ← Pendiente hasta que admin confirme
            paymentMethod: 'banco_pichincha',
            receiptUrl: receiptUrl,
            securityCode: securityCode
        });

        // Enviar email (sin código de retiro todavía, porque está pendiente)
        if (user?.email) {
            await emailService.sendPedidoConfirmado(
                user.email,
                user.displayName || 'Cliente',
                orderNumber
            );
        }

        clearCart();
        navigate('/order-success', { state: { orderNumber, securityCode } });
        toast.success('Pedido registrado. Espera confirmación por email');
    } catch (error) {
        console.error(error);
        toast.error('Error al finalizar pedido');
    } finally {
        setProcessingSale(false);
    }
};
*/

export { };
