# 🚀 Servidor Backend para Scraping de Shopify y Proxy de Imágenes B2

Este servidor backend maneja:
- Scraping de productos desde Shopify usando la API pública
- Descarga y upload de imágenes a Backblaze B2
- Proxy de imágenes con CORS para el frontend

## 📋 Requisitos

- Node.js 16+ 
- npm o yarn
- Credenciales de Backblaze B2 configuradas

## 🔧 Instalación

1. Instalar dependencias (desde la raíz del proyecto):
```bash
npm install
```

2. Configurar variables de entorno (opcional):
```bash
# Crear archivo .env en la raíz del proyecto si necesitas cambiar el puerto
PORT=5000
```

## 🚀 Ejecución

### Desarrollo
```bash
npm run server:dev
```

### Producción
```bash
npm run server
```

El servidor correrá en `http://localhost:5000` por defecto.

## 📡 Endpoints

### `POST /api/shopify/import`
Importa productos de Shopify y opcionalmente sube imágenes a B2.

**Body:**
```json
{
  "collection": "all",
  "uploadImages": true
}
```

**Response:**
```json
{
  "success": true,
  "count": 950,
  "perfumes": [...]
}
```

### `GET /api/shopify/stats`
Obtiene estadísticas de productos (marcas, colecciones, etc.).

**Response:**
```json
{
  "totalProducts": 950,
  "totalBrands": 57,
  "totalCollections": 60,
  "brands": {...},
  "collections": {...}
}
```

### `GET /api/b2/image?path=...`
Proxy para servir imágenes desde Backblaze B2 con CORS habilitado.

**Query Parameters:**
- `path`: Ruta de la imagen en B2 (ej: `perfumes/lattafa/product-123.jpg`)

### `GET /health`
Health check endpoint.

## 🔐 Configuración de Backblaze B2

Las credenciales están configuradas en `server/config/b2.config.ts`:

- **Endpoint**: `s3.us-east-005.backblazeb2.com`
- **Bucket**: `perfumes`
- **Region**: `us-east-005`

## 📝 Notas

- El scraping usa la API pública de Shopify (`/products.json`)
- Las imágenes se descargan desde Shopify y se suben a B2
- El proxy de imágenes resuelve problemas de CORS
- El servidor procesa hasta 250 productos por página con paginación automática











