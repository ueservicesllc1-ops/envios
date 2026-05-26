export const mockOrders = [
  {
    id: "ORD-9823",
    date: "24 May 2026",
    status: "En Camino", // Procesando, Enviado, En Camino, Entregado
    total: 39.98,
    items: [
      {
        id: "1",
        title: "Auriculares Inalámbricos Bluetooth 5.3",
        price: 19.99,
        quantity: 2,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "ORD-7512",
    date: "12 May 2026",
    status: "Entregado",
    total: 15.99,
    items: [
      {
        id: "3",
        title: "Mochila Antirrobo Impermeable USB",
        price: 15.99,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&auto=format&fit=crop&q=60"
      }
    ]
  }
];
