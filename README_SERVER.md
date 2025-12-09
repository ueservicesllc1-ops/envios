# 📋 Detalle Técnico: Sistema de Scraping y Almacenamiento

## 🎯 Resumen

Este sistema obtiene productos de Shopify, descarga sus imágenes y las almacena en Backblaze B2, luego guarda los datos en Firestore.

## 🔧 Arquitectura

```
Frontend (React) 
    ↓
Backend API (Express) 
    ↓
Shopify API (products.json) → Backblaze B2 → Firestore
```

## 📦 Componentes

### 1. Backend Server (`server/`)
- **Express.js** para el servidor API
- **@aws-sdk/client-s3** para Backblaze B2 (compatible con S3)
- **node-fetch** para peticiones HTTP

### 2. Scraping de Shopify (`server/services/shopifyScraper.ts`)
- Usa la API pública: `https://fragrancewholesalerusa.myshopify.com/products.json`
- Paginación automática (250 productos por página)
- Normalización de marcas y colecciones
- Detección automática de colecciones (solo Arabiyat tiene colecciones definidas)

### 3. Almacenamiento de Imágenes (`server/services/b2Service.ts`)
- Descarga imágenes desde Shopify con headers apropiados
- Sube a Backblaze B2 usando S3 SDK
- Estructura: `perfumes/{brand}/{filename}`
- Nombres únicos: `{brand}-{product}-{timestamp}-{randomId}.{ext}`

### 4. Proxy de Imágenes (`server/index.ts`)
- Endpoint: `/api/b2/image?path=...`
- Headers CORS configurados
- Cache de 1 año
- Content-Type automático

## 🔄 Flujo de Datos

1. **Frontend** llama a `POST /api/shopify/import`
2. **Backend** obtiene productos de Shopify (paginación)
3. Para cada producto:
   - Descarga imagen desde Shopify
   - Sube imagen a B2
   - Obtiene URL del proxy
4. Procesa y normaliza datos
5. Retorna perfumes procesados al frontend
6. **Frontend** guarda en Firestore usando `perfumeService.createBatch()`

## 📊 Estadísticas Esperadas

- **Total productos**: ~950
- **Total marcas**: ~57
- **Total colecciones**: ~60
- **Tiempo estimado**: 25-30 minutos (con upload de imágenes)

## 🚀 Uso

### Desarrollo Local

1. Iniciar servidor backend:
```bash
npm run server:dev
```

2. Iniciar frontend:
```bash
npm start
```

3. En el admin, ir a "Perfumes" y la importación se hará automáticamente si no hay perfumes.

### Producción

1. Desplegar servidor backend (Railway, Heroku, etc.)
2. Configurar `REACT_APP_API_URL` en el frontend
3. El frontend usará la URL del servidor desplegado

## 🔐 Seguridad

- Credenciales de B2 en `server/config/b2.config.ts` (no commitear en producción)
- Proxy de imágenes con CORS habilitado
- Firestore security rules para perfumes

## 📝 Notas Técnicas

- **CORS**: Resuelto usando backend proxy
- **Rate Limiting**: Delays de 500ms entre páginas, 1.5s entre imágenes
- **Batch Operations**: Firestore writeBatch (máximo 500 por batch)
- **Image Validation**: Mínimo 100 bytes, Content-Type automático











