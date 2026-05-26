# ShopVibe (Vibe Market) - Proyecto React + Vite

Esta es la aplicación web rediseñada para el sistema de Vibe Market. 
Fue construida utilizando Vite, React 18 y Tailwind CSS.

## Características de la Arquitectura

1. **Interfaz Moderna:** Diseño 100% responsivo, con glassmorphism, micro-interacciones (Lucide icons) y componentes reutilizables.
2. **Degradación Elegante:** La aplicación cuenta con servicios duales. Si Firebase no está configurado, la aplicación utilizará automáticamente `localStorage` y `mockProducts.js` para que el entorno de desarrollo nunca se rompa.
3. **Gestor de Estado (Contexts):** Se han creado Contexts nativos para el Carrito, Favoritos (Wishlist), Notificaciones (Toast) y Autenticación de Firebase.

## Configuración de Firebase

Para activar las funcionalidades reales en la nube, debes crear un archivo `.env` en la raíz de `E:\Envios\market\web-app` (donde está el `package.json`).

### Variables de Entorno requeridas (`.env`)

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### Colecciones Planificadas (Firestore)
- `customers`: Perfiles de usuarios con su `role` (buyer/seller/admin).
- `products`: Catálogo real de productos del marketplace, gestionados por los vendedores.
- `sellers`: Perfiles de tiendas o vendedores (creados automáticamente en el onboarding).
- `orders`: Almacenamiento de pedidos del usuario.
- `messages`: Mensajes inter-usuarios (con subcolección `items`).

### Estructura de Colecciones Principales

**products/{productId}**
```json
{
  "sellerId": "uid",
  "sellerUserId": "uid",
  "sellerName": "Store Name",
  "name": "Product Title",
  "title": "Product Title",
  "shortDescription": "...",
  "description": "...",
  "price": 99.99,
  "category": "Perfumes",
  "stock": 10,
  "sku": "SKU123",
  "status": "active | draft | archived",
  "images": ["url1", "url2"],
  "createdAt": "timestamp"
}
```

**sellers/{sellerId}**
```json
{
  "userId": "uid",
  "storeName": "My Store",
  "bio": "About my store",
  "category": "Perfumes",
  "country": "US",
  "rating": 0,
  "totalSales": 0,
  "createdAt": "timestamp"
}
```

## Flujo del Vendedor (Seller Workflow)

### ¿Cómo crear una cuenta de vendedor?
1. Inicia sesión con cualquier cuenta normal (rol `buyer`).
2. Ve a tu perfil y haz clic en **"Panel de Vendedor"** (o navega a `/seller`).
3. Verás una tarjeta de presentación que te invita a vender en ShopVibe.
4. Haz clic en **"Convertirme en Vendedor"** y llena el formulario de configuración (nombre de la tienda, categoría, etc.).
5. Tu rol se actualizará automáticamente a `seller` en Firestore y tendrás acceso al panel de control.

### ¿Cómo añadir productos?
1. Desde el Dashboard de Vendedor, haz clic en **"Gestionar Productos"**.
2. Haz clic en **"Añadir Producto"** (`/seller/products/new`).
3. Llena la información requerida. Además, si quieres que otros promocionen tu producto, marca la casilla **"Permitir que Creadores promocionen este producto"** y pon un porcentaje (ej. 15%).
4. El producto se guardará en Firestore bajo la colección `products` y aparecerá inmediatamente en el Marketplace si tiene estado `active`.

## Flujo del Creador / Afiliado (Creator Workflow)

### ¿Cómo convertirse en Creador y ganar dinero?
1. Inicia sesión y ve a **"Centro de Creadores"** (`/creator`).
2. Si no eres creador, verás una pantalla de bienvenida. Dale a **"Convertirme en Creador"** (esto añadirá `isCreator: true` a tu perfil de usuario en Firestore).
3. Entra al **Mercado de Afiliados**, donde verás *únicamente* los productos que los vendedores han habilitado con comisión.
4. Haz clic en **"Añadir a Vitrina"**. Esto guardará el producto en tu Showcase personal.
5. Sube videos al **VibeFeed** y etiqueta los productos de tu vitrina. Cuando un comprador vea tu video, dé clic en el producto y lo compre, el sistema registrará tu `affiliateId` para pagarte tu comisión de forma automática.

### ¿Qué falta por implementar (Media Storage)?
Actualmente las imágenes de los productos deben ingresarse como **URLs externas** separadas por comas. 
En futuros pasos la arquitectura para el almacenamiento de medios será:
- **Backblaze B2:** Se utilizará para almacenar imágenes de productos, logos y banners de tiendas.
- **Backend Seguro:** La subida a Backblaze B2 se realizará a través de un endpoint seguro en el backend para no exponer las credenciales de B2 en el frontend (React/Vite).
- **Base de Datos (Firestore):** Solo almacenará metadatos, guardando las URLs o los `keys` de los archivos subidos a B2.

### Activación en Consola Firebase
Para que todo funcione, debes:
1. Activar **Authentication**. Habilitar **Email/Password** y **Google Auth**.
2. Activar **Firestore Database** con reglas básicas de seguridad que permitan leer `products` de manera pública y escribir en `products`/`sellers` a usuarios autenticados.

## Scripts

- `npm run dev`: Inicia el servidor de desarrollo en puerto 3000 (o 5173).
- `npm run build`: Genera el build optimizado para producción.
