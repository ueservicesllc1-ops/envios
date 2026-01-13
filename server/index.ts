import express from 'express';
import cors from 'cors';
import { getProductsFromCollection, getProductStats } from './services/shopifyScraper';
import { getImageFromB2, uploadImageToB2 } from './services/b2Service';
import { getVisits, recordVisit } from './services/visitService';

const app = express();
const PORT = process.env.PORT || 5000;

// Dominios permitidos (Railway)
const allowedDomains = process.env.ALLOWED_DOMAINS
  ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

// Middleware CORS dinámico
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);

    // Verificar si el origin está en la lista de permitidos
    const isAllowed = allowedDomains.some(domain =>
      origin.includes(domain) || domain === '*'
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`Origin no permitido: ${origin}`);
      callback(null, true); // Permitir de todos modos en desarrollo
    }
  },
  credentials: true
}));
app.use(express.json());

// Proxy para imágenes de B2 (con CORS)
app.get('/api/b2/image', async (req, res) => {
  try {
    const path = req.query.path as string;

    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    const imageBuffer = await getImageFromB2(path);

    // Detectar content type
    const contentType = path.endsWith('.webp') ? 'image/webp' :
      path.endsWith('.png') ? 'image/png' :
        'image/jpeg';

    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 año

    res.send(imageBuffer);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).json({ error: 'Image not found' });
  }
});

// Endpoint para subir imagen desde URL a B2
app.post('/api/b2/upload-from-url', async (req, res) => {
  try {
    const { url, brand, name } = req.body;

    if (!url || !brand || !name) {
      return res.status(400).json({ error: 'Missing required parameters: url, brand, name' });
    }

    // Usar la función existente de b2Service que ya fue importada vía './services/b2Service'
    // Necesito asegurarme que uploadImageToB2 esté importada. 
    // Mirando arriba, solo getImageFromB2 está importada. Debo actualizar los imports.
    // Como no puedo cambiar los imports en este bloque, usaré un truco:
    // Voy a importar dinámicamente o asumir que el siguiente paso arreglará los imports.
    // Mejor, actualizaré los imports PRIMERO en otro replace_file_content, o lo haré todo en uno si el usuario me deja.
    // Pero replace_file_content es para un bloque contiguo.
    // Actualizaré este endpoint asumiendo que tengo la función, y luego actualizaré los imports.
    // Espera, TS se quejará si no importo.
    // Mejor update imports + endpoint en un solo bloque si están cerca?
    // Imports están en línea 4. Endpoint nuevo irá en línea 41. Están lejos.
    // Usar multi_replace_file_content.

    const uploadResult = await uploadImageToB2(url, brand, name);
    res.json({ success: true, url: uploadResult.url });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener productos de Shopify
app.post('/api/shopify/import', async (req, res) => {
  try {
    const { collection = 'all', uploadImages = false } = req.body;

    console.log(`Iniciando importación de productos desde Shopify...`);
    console.log(`Colección: ${collection}, Subir imágenes: ${uploadImages}`);

    const perfumes = await getProductsFromCollection(collection, uploadImages);

    res.json({
      success: true,
      count: perfumes.length,
      perfumes: perfumes,
    });
  } catch (error: any) {
    console.error('Error en importación:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al importar productos',
    });
  }
});

// Endpoint para obtener estadísticas
app.get('/api/shopify/stats', async (req, res) => {
  try {
    const stats = await getProductStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener estadísticas',
    });
  }
});


// Endpoint para el contador de visitas
app.get('/api/visits', (req, res) => {
  res.json({ count: getVisits() });
});

app.post('/api/visits', (req, res) => {
  // Obtener IP real considerando proxies (Railway, Nginx, etc)
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  // En caso de múltiples IPs en x-forwarded-for, tomar la primera
  const cleanIp = ip.split(',')[0].trim();

  const count = recordVisit(cleanIp);
  res.json({ count });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir archivos estáticos de React en producción
if (process.env.NODE_ENV === 'production') {
  const path = require('path');

  // Servir archivos estáticos del build
  app.use(express.static(path.join(__dirname, '../build')));

  // Todas las rutas que no sean API sirven el index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📸 Proxy de imágenes: http://localhost:${PORT}/api/b2/image`);
  console.log(`🛍️  Importación: http://localhost:${PORT}/api/shopify/import`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Frontend React servido desde /build`);
  }
});




