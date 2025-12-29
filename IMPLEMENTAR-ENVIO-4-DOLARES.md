# 📦 CÓDIGO PARA AGREGAR CÁLCULO DE ENVÍO - $4 por libra

## ✅ **Paso 1: COMPLETADO**
La interfaz `OnlineSale` ya fue actualizada con `shippingCost` y `shippingWeight`.

---

## 🔧 **Paso 2: Agregar en Home.tsx**

### **A. Agregar constante de precio (después de los imports):**

```typescript
// Precio de envío por libra
const SHIPPING_PRICE_PER_LB = 4;
```

### **B. Agregar funciones de cálculo (después de otras funciones helper):**

```typescript
// Calcular peso total en libras
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

// Calcular costo de envío
const calculateShippingCost = (): number => {
  const weight = calculateTotalWeight();
  return weight * SHIPPING_PRICE_PER_LB;
};

// Calcular subtotal de productos (sin envío)
const calculateSubtotal = (): number => {
  return cart.reduce((sum, item) => {
    const price = item.type === 'product'
      ? (item.product?.price || 0)
      : (item.perfume?.price || 0);
    return sum + (price * item.quantity);
  }, 0);
};

// Calcular total incluyendo envío
const calculateGrandTotal = (): number => {
  return calculateSubtotal() + calculateShippingCost();
};
```

### **C. Actualizar donde se crea la venta online:**

Buscar donde se crea el objeto `onlineSaleData` o similar y AGREGAR:

```typescript
const onlineSaleData: Omit<OnlineSale, 'id'> = {
  // ... campos existentes ...
  totalAmount: calculateGrandTotal(), // ← CAMBIAR de subtotal a grand total
  shippingCost: calculateShippingCost(), // ← NUEVO
  shippingWeight: calculateTotalWeight(), // ← NUEVO
  // ... resto de campos ...
};
```

### **D. Actualizar el modal de checkout para mostrar desglose:**

Buscar donde se muestra el total en el checkout modal y REEMPLAZAR con:

```typescript
{/* Desglose de Costos */}
<div className="bg-gray-50 p-6 rounded-lg space-y-3 mb-6">
  <h3 className="font-semibold text-gray-900 mb-4">Resumen del Pedido</h3>
  
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Subtotal productos:</span>
    <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
  </div>
  
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Peso total:</span>
    <span className="font-medium">{calculateTotalWeight().toFixed(2)} lb</span>
  </div>
  
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Envío ({SHIPPING_PRICE_PER_LB}/lb):</span>
    <span className="font-medium">${calculateShippingCost().toFixed(2)}</span>
  </div>
  
  <div className="border-t border-gray-300 pt-3 mt-3">
    <div className="flex justify-between">
      <span className="text-lg font-bold text-gray-900">TOTAL A PAGAR:</span>
      <span className="text-lg font-bold text-blue-600">${calculateGrandTotal().toFixed(2)}</span>
    </div>
  </div>
</div>
```

---

## 📊 **Ejemplo de cómo funciona:**

```
Carrito:
- Perfume (100g) x 2 = 200g
- Crema (300g) x 1 = 300g
Total: 500g = 1.10 lb → Se cobra 1.10 lb

Desglose:
Subtotal productos: $45.00
Peso total: 1.10 lb
Envío ($4/lb): $4.40
─────────────────────
TOTAL A PAGAR: $49.40
```

---

## ⚠️ **IMPORTANTE:**

Si el checkout está en un componente separado o si no encuentras dónde hacer los cambios, dime y te ayudo a ubicarlo específicamente. 

El archivo Home.tsx es muy grande, así que déjame saber si necesitas que busque secciones específicas.

---

**¿Necesitas que busque alguna sección específica del código o ya puedes aplicarlo?**
