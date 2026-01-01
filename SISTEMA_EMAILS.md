# Sistema de Notificaciones por Email - EmailJS

## 📧 Configuración Inicial

### 1. Configurar EmailJS

1. Ve a [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Copia tu **Public Key** (la encontrarás en Account > API Keys)
3. Abre `src/services/emailService.ts` y reemplaza:
   ```typescript
   const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // ← REEMPLAZA ESTO
   ```

### 2. Crear Plantillas en EmailJS

Para cada tipo de notificación, crea una plantilla en el dashboard de EmailJS:

#### Plantilla: Compra Exitosa
- **Template ID**: `template_compra_exitosa`
- **Template Name**: Compra Exitosa
- **Content**: Copia el HTML de `emailTemplates.json > compra_exitosa > htmlTemplate`

**Variables a configurar en EmailJS:**
```
{{to_email}}
{{to_name}}
{{subject}}
{{customerName}}
{{orderNumber}}
{{securityCode}}
{{totalAmount}}
{{items}}
{{deliveryAddress}}
{{estimatedDate}}
```

#### Otras Plantillas
Repite el proceso para:
- `template_pedido_confirmado`
- `template_pedido_enviado`
- `template_pedido_entregado`
- `template_cambio_estado`

## 🔌 Integración en el Código

### Ejemplo 1: Enviar email al completar compra

```typescript
// En CartPage.tsx, después de crear la orden exitosamente:

import { emailService } from '../services/emailService';
import { format, addDays } from 'date-fns';

// Dentro de tu función de checkout (ejemplo):
const handleCompraExitosa = async () => {
    try {
        // 1. Crear la orden (tu código existente)
        const orderNumber = `CE-${Date.now()}`;
        const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // ... código para crear la orden ...
        
        // 2. Enviar email de confirmación
        await emailService.sendCompraExitosa({
            customerName: user.displayName || 'Cliente',
            customerEmail: user.email!,
            orderNumber: orderNumber,
            securityCode: securityCode,
            totalAmount: totalWithShipping,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            deliveryAddress: selectedAddress?.fullAddress || 'Retiro en tienda',
            estimatedDate: format(addDays(new Date(), 5), 'dd/MM/yyyy')
        });

        toast.success('¡Compra exitosa! Revisa tu email');
        navigate('/order-success', { state: { orderNumber, securityCode } });
    } catch (error) {
        console.error(error);
        toast.error('Error al procesar la compra');
    }
};
```

### Ejemplo 2: Notificar cambio de estado de pedido

```typescript
// En el componente de administración de pedidos:

import { emailService } from '../services/emailService';

const cambiarEstadoPedido = async (orderId: string, nuevoEstado: string) => {
    // 1. Actualizar estado en BD
    await onlineSaleService.update(orderId, { status: nuevoEstado });
    
    // 2. Obtener datos del pedido y cliente
    const order = await onlineSaleService.getById(orderId);
    
    // 3. Enviar notificación personalizada según el estado
    if (nuevoEstado === 'shipped') {
        await emailService.sendPedidoEnviado(
            order.customerEmail!,
            order.customerName!,
            order.number,
            'TRACK123456789', // Número de rastreo
            'DHL Express',
            '15/01/2026'
        );
    } else if (nuevoEstado === 'delivered') {
        await emailService.sendPedidoEntregado(
            order.customerEmail!,
            order.customerName!,
            order.number
        );
    } else {
        // Para otros estados, usar la notificación genérica
        await emailService.sendCambioEstado(
            order.customerEmail!,
            order.customerName!,
            order.number,
            nuevoEstado,
            'Tu pedido ha sido actualizado'
        );
    }
};
```

## 📝 Plantillas Disponibles

### 1. `compra_exitosa`
- **Cuándo usar**: Inmediatamente después de que el cliente complete el pago
- **Método**: `emailService.sendCompraExitosa(params)`
- **Incluye**: Código de retiro, resumen de compra, dirección

### 2. `pedido_confirmado`
- **Cuándo usar**: Cuando el admin confirma el pedido manualmente
- **Método**: `emailService.sendPedidoConfirmado(email, name, orderNumber)`

### 3. `pedido_enviado`
- **Cuándo usar**: Cuando se despacha el pedido
- **Método**: `emailService.sendPedidoEnviado(email, name, orderNumber, tracking, carrier, estimatedArrival)`

### 4. `pedido_entregado`
- **Cuándo usar**: Cuando el cliente recibe su pedido
- **Método**: `emailService.sendPedidoEntregado(email, name, orderNumber)`

### 5. `cambio_estado`
- **Cuándo usar**: Para cualquier otro cambio de estado
- **Método**: `emailService.sendCambioEstado(email, name, orderNumber, newStatus, message)`

## 🎨 Personalizar Plantillas

Edita `src/config/emailTemplates.json`:

```json
{
  "compra_exitosa": {
    "subject": "¡Tu pedido está confirmado! 🎉", // ← Cambia el asunto
    "htmlTemplate": "<div>...</div>" // ← Modifica el HTML
  }
}
```

**Tips de diseño:**
- Usa colores de tu marca
- Mantén el diseño responsive (max-width: 600px)
- Incluye siempre un CTA (Call To Action)
- Agrega tus redes sociales en el footer

## 🔒 Seguridad

⚠️ **IMPORTANTE**: 
- No compartas tu Public Key en repositorios públicos
- Usa variables de entorno en producción:
  ```typescript
  const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
  ```

## ✅ Testing

Prueba el envío de emails:

```typescript
// En consola del navegador
import { emailService } from './services/emailService';

emailService.sendCompraExitosa({
    customerEmail: 'tu-email@test.com',
    customerName: 'Test User',
    orderNumber: 'CE-TEST-001',
    securityCode: '123456',
    totalAmount: 99.99,
    items: [{ name: 'Producto Test', quantity: 1, price: 99.99 }],
    deliveryAddress: 'Av. Test 123',
    estimatedDate: '15/01/2026'
});
```

## 📊 Monitoreo

EmailJS proporciona estadísticas de emails enviados en su dashboard:
- Emails enviados
- Tasa de entrega
- Errores

## 🆘 Solución de Problemas

### Error: "Public key is required"
- Verifica que hayas configurado `EMAILJS_PUBLIC_KEY` correctamente

### Error: "Template not found"
- Asegúrate de haber creado las plantillas en EmailJS dashboard
- Verifica que los IDs coincidan exactamente

### Emails no llegan
- Revisa la carpeta de spam
- Verifica el email del destinatario
- Chequea los logs de EmailJS dashboard

## 📞 Soporte

- [Documentación EmailJS](https://www.emailjs.com/docs/)
- [EmailJS Dashboard](https://dashboard.emailjs.com/)
