# Debugging: Pedidos No Aparecen en "Mis Pedidos"

## Problema Reportado

Los pedidos realizados desde la tienda online no aparecen en la página `/my-orders` (Mis Pedidos) después de ser creados, incluso cuando están en estado "pending" (pendiente de confirmación).

## Posibles Causas

### 1. **Desincronización de Email**
El email ingresado en el formulario de checkout podría no coincidir con el email del usuario autenticado.

**Ejemplo:**
- Usuario autenticado con: `usuario@gmail.com`
- Email ingresado en checkout: `otro@gmail.com`

**Resultado:** El pedido se guarda con `customerEmail: otro@gmail.com` pero la página `/my-orders` filtra por `usuario@gmail.com`.

### 2. **Usuario No Autenticado**
Si el usuario no está autenticado cuando realiza el pedido, el email del formulario podría no coincidir después.

### 3. **Case Sensitivity (Mayúsculas/Minúsculas)**
Firebase Auth podría normalizar emails de manera diferente que el input manual.

## Verificación con Console Logs

He agregado logging de debugging en dos lugares clave:

### 1. Al Crear el Pedido (`Home.tsx`)

```typescript
console.log('💰 Creando venta con datos:', {
  saleNumber,
  customerEmail: sale.customerEmail,
  userEmail: user?.email,
  status: sale.status,
  itemCount: sale.items.length
});
```

### 2. Al Cargar Pedidos (`CustomerOrders.tsx`)

```typescript
console.log('🔍 Cargando pedidos para:', user.email);
console.log('📦 Total de ventas en sistema:', allSales.length);
console.log('✅ Pedidos del usuario:', userOrders.length);
```

## Cómo Diagnosticar el Problema

### Paso 1: Abrir Consola del Navegador
1. Presiona **F12** en el navegador
2. Ve a la pestaña **Console**

### Paso 2: Realizar un Pedido de Prueba
1. Inicia sesión en la aplicación
2. Agrega productos al carrito
3. Ve al checkout
4. **IMPORTANTE:** En el formulario de checkout, usa el **MISMO EMAIL** con el que iniciaste sesión
5. Completa el pedido

### Paso 3: Revisar Logs al Crear
Deberías ver en la consola:
```
💰 Creando venta con datos: {
  saleNumber: "VENTA-1735408123456",
  customerEmail: "usuario@gmail.com",  ← ESTE EMAIL
  userEmail: "usuario@gmail.com",      ← DEBE COINCIDIR CON ESTE
  status: "pending",
  itemCount: 2
}
```

**Si los emails NO coinciden, ahí está el problema.**

### Paso 4: Ir a "Mis Pedidos"
1. Navega a `http://localhost:3000/my-orders`
2. Revisa los logs en consola:

```
🔍 Cargando pedidos para: usuario@gmail.com
📦 Total de ventas en sistema: 5
❌ Venta no coincide: {
  saleEmail: "otro@gmail.com",
  userEmail: "usuario@gmail.com",
  saleNumber: "VENTA-12345"
}
✅ Pedidos del usuario: 0
```

### Paso 5: Revisar Info de Debugging en Pantalla
Si no hay pedidos, ahora verás un panel con:
```
🔍 Información de depuración:
Usuario: Juan Pérez
Email: usuario@gmail.com
Revisa la consola del navegador (F12) para más detalles
```

## Solución Temporal (Mientras Debuggeamos)

### Opción 1: Auto-rellenar Email
Podemos modificar el checkout para que auto-rellene el email del usuario autenticado:

```typescript
// En Home.tsx, al abrir el modal de checkout
useEffect(() => {
  if (user?.email && showCheckoutModal) {
    setCustomerInfo(prev => ({
      ...prev,
      email: user.email
    }));
  }
}, [user, showCheckoutModal]);
```

### Opción 2: Deshabilitar Campo Email
Hacer que el campo email sea de solo lectura si el usuario está autenticado.

### Opción 3: Validación Estricta
Agregar una validación que muestre warning si los emails no coinciden.

## Archivos Modificados

1. **`src/pages/CustomerOrders.tsx`**: Agregado debugging al cargar pedidos
2. **`src/pages/Home.tsx`**: Agregado debugging al crear ventas

## Próximos Pasos

1. **Realizar pedido de prueba** con los logs activados
2. **Capturar información de consola** (screenshot o copiar texto)
3. **Verificar coincidencia de emails**
4. **Si no coinciden**: Implementar auto-rellenado de email
5. **Si coinciden**: Revisar filtro de Firestore

---

**Fecha:** 2025-12-28  
**Estado:** En diagnóstico  
**Prioridad:** Alta
