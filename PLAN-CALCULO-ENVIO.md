# 📦 Implementación de Cálculo de Envío en Checkout

## 🎯 **Requerimientos:**

1. Calcular peso total de productos en el carrito
2. Convertir a libras  
3. Cobrar mínimo 1 libra (aunque pese menos)
4. Mostrar desglose en checkout:
   - Subtotal productos
   - Peso total (lb)
   - Costo envío
   - **TOTAL**

---

## ⚙️ **Necesito información:**

### ❓ **¿Cuál es el precio por libra de envío?**
Ejemplo: $5 por libra, $10 por libra, etc.

---

## 🛠️ **Implementación (una vez tenga el precio):**

### **1. Agregar función para calcular peso:**

```typescript
// En Home.tsx, agregar estas funciones

const calculateTotalWeight = (): number => {
  let totalGrams = 0;
  
  for (const item of cart) {
    const weight = item.type === 'product' 
      ? item.product?.weight || 0  
      : item.perfume?.weight || 0;
    
    totalGrams += weight * item.quantity;
  }
  
  // Convertir gramos a libras (1 lb = 453.592 gramos)
  const pounds = totalGrams / 453.592;
  
  // Mínimo 1 libra
  return Math.max(1, Math.ceil(pounds * 100) / 100); // Redondear a 2 decimales
};

const SHIPPING_PRICE_PER_LB = 5; // ← DEFINIR PRECIO AQUÍ

const calculateShippingCost = (): number => {
  const weight = calculateTotalWeight();
  return weight * SHIPPING_PRICE_PER_LB;
};

const calculateSubtotal = (): number => {
  return cart.reduce((sum, item) => {
    const price = item.type === 'product'
      ? item.product?.price || 0
      : item.perfume?.price || 0;
    return sum + (price * item.quantity);
  }, 0);
};

const calculateGrandTotal = (): number => {
  return calculateSubtotal() + calculateShippingCost();
};
```

### **2. Actualizar el modal de checkout:**

Buscar donde se muestra el total del carrito y agregar:

```typescript
{/* Desglose de Costos */}
<div className="bg-gray-50 p-4 rounded-lg space-y-2">
  <div className="flex justify-between text-sm">
    <span>Subtotal productos:</span>
    <span>${calculateSubtotal().toFixed(2)}</span>
  </div>
  
  <div className="flex justify-between text-sm text-gray-600">
    <span>Peso total:</span>
    <span>{calculateTotalWeight().toFixed(2)} lb</span>
  </div>
  
  <div className="flex justify-between text-sm">
    <span>Costo de envío:</span>
    <span>${calculateShippingCost().toFixed(2)}</span>
  </div>
  
  <div className="border-t border-gray-300 pt-2 mt-2">
    <div className="flex justify-between text-lg font-bold">
      <span>TOTAL A PAGAR:</span>
      <span className="text-blue-600">${calculateGrandTotal().toFixed(2)}</span>
    </div>
  </div>
</div>
```

### **3. Actualizar la creación de la venta:**

Cuando se crea la venta online, guardar también el shipping:

```typescript
const onlineSaleData: Omit<OnlineSale, 'id'> = {
  // ... campos existentes ...
  totalAmount: calculateGrandTotal(), // Total incluyendo envío
  shippingCost: calculateShippingCost(), // Nuevo campo
  shippingWeight: calculateTotalWeight(), // Nuevo campo
  // ...
};
```

### **4. Actualizar interfaz OnlineSale:**

En `src/services/onlineSaleService.ts`:

```typescript
export interface OnlineSale {
  // ... campos existentes ...
  shippingCost?: number;
  shippingWeight?: number;  // en libras
  // ...
}
```

---

## 📋 **Pasos para aplicar:**

1. **Dime el precio por libra** (ej: $5, $10, etc.)
2. Aplicaré el código automáticamente
3. Verificarás que funcione correctamente

---

## 🧪 **Ejemplo de cómo se vería:**

```
Carrito:
- Perfume A (100g) x 2 = 200g
- Producto B (300g) x 1 = 300g
Total: 500g = 1.10 lb → Se cobra 2 lb (redondeado)

Desglose:
Subtotal productos: $45.00
Peso total: 2.00 lb  
Costo de envío: $10.00 (2 lb × $5/lb)
─────────────────────
TOTAL A PAGAR: $55.00
```

---

**⏳ Esperando que me digas el precio por libra para aplicar el código...**
