export const calculateCartTotals = (cartItems) => {
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 50 ? 0 : 5.99; // Envío gratis en pedidos sobre $50
  const taxRate = 0.12; // 12% IVA simulado
  const tax = subtotal * taxRate;
  const total = subtotal + shipping + tax;

  return {
    subtotal,
    shipping,
    tax,
    total
  };
};
