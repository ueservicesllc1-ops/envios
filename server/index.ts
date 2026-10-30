import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getProductsFromCollection, getProductStats } from './services/shopifyScraper';
import { getImageFromB2, uploadImageToB2 } from './services/b2Service';
import { getVisits, recordVisit } from './services/visitService';
import { notificationService } from './services/notificationService';
import { posRouter } from './routes/pos';
import { perfumeAdvisorRouter } from './routes/perfumeAdvisor';

const app = express();
const PORT = process.env.RAILWAY_ENVIRONMENT ? (Number(process.env.PORT) || 5000) : (Number(process.env.SERVER_PORT) || 5000);

// Dominios permitidos
const defaultDomains = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'];
const allowedDomains = [
  ...defaultDomains,
  ...(process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim()) : [])
];

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
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API del Punto de Venta Android (ventas validadas en servidor)
app.use('/api/pos', posRouter);

// API del Asesor de Perfumes (identificación con IA, escaneo, notas, dupes)
app.use('/api/perfumes', perfumeAdvisorRouter);

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
    console.error('Error proxy B2:', error);
    res.status(500).json({ error: 'Error fetching image' });
  }
});

// Proxy general para imágenes (útil para saltarse CORS de Firebase Storage u otros)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const axios = require('axios');
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 año

    const buffer = Buffer.from(response.data);

    res.send(buffer);
  } catch (error) {
    console.error('Error in proxy-image:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
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

// Endpoint para enviar notificaciones push
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body;

    if (!tokens || !title || !body) {
      return res.status(400).json({ error: 'Missing required parameters: tokens, title, body' });
    }

    const result = await notificationService.sendPushNotification(tokens, title, body, data);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/notifications/send:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar imágenes y detalles de producto en la web
app.get('/api/search-product-images', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const barcode = (req.query.barcode as string) || '';

    const results: Array<{ url: string; title: string; source: string; thumb?: string }> = [];
    let productInfo: any = null;

    const https = require('https');
    const fetchHelper = (url: string, headers: any = {}) => {
      return new Promise<string>((resolve) => {
        https.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...headers
          }
        }, (resp: any) => {
          let data = '';
          resp.on('data', (chunk: any) => data += chunk);
          resp.on('end', () => resolve(data));
        }).on('error', () => resolve(''));
      });
    };

    // 1. Si hay código de barras, consultar UPCitemdb
    if (barcode) {
      try {
        const upcData = await fetchHelper(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`);
        if (upcData) {
          const parsed = JSON.parse(upcData);
          if (parsed.items && parsed.items.length > 0) {
            const item = parsed.items[0];
            productInfo = {
              name: item.title,
              brand: item.brand,
              category: item.category,
              description: item.description
            };
            if (Array.isArray(item.images)) {
              item.images.forEach((imgUrl: string) => {
                if (imgUrl && !results.some(r => r.url === imgUrl)) {
                  results.push({
                    url: imgUrl,
                    title: item.title || 'Foto de producto',
                    source: 'UPC Database',
                    thumb: imgUrl
                  });
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching UPCitemdb in backend:', err);
      }
    }

    // 2. Buscar en Bing Images (por nombre, por título del UPC, o por el código de barras como último recurso)
    const searchTerm = q || productInfo?.name || barcode;
    if (searchTerm) {
      const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      const terms = [searchTerm];
      // Si el nombre es corto/ambiguo, ampliar con la marca del UPC
      if (q && productInfo?.brand && !q.toLowerCase().includes(String(productInfo.brand).toLowerCase())) {
        terms.unshift(`${productInfo.brand} ${q}`);
      }
      for (const term of terms) {
        if (results.length >= 18) break;
        try {
          const bingHtml = await fetchHelper(`https://www.bing.com/images/search?q=${encodeURIComponent(term + ' product')}&form=HDRSC2&first=1&qft=+filterui:photo-photo`);
          if (!bingHtml) continue;
          const regex = /murl&quot;:&quot;(https?:\/\/.+?)&quot;(?:(?:(?!murl).)*?turl&quot;:&quot;(https?:\/\/.+?)&quot;)?/g;
          let match;
          let count = 0;
          while ((match = regex.exec(bingHtml)) !== null && count < 15) {
            const imgUrl = decode(match[1]);
            const thumb = match[2] ? decode(match[2]) : imgUrl;
            if (imgUrl && imgUrl.length < 500 && !results.some(r => r.url === imgUrl)) {
              results.push({
                url: imgUrl,
                title: term,
                source: 'Búsqueda Web',
                thumb
              });
              count++;
            }
          }
        } catch (err) {
          console.warn('Error fetching Bing images in backend:', err);
        }
      }
    }

    res.json({
      success: true,
      images: results,
      productInfo
    });
  } catch (error: any) {
    console.error('Error in /api/search-product-images:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir la nueva aplicación web de Asesores de Perfumes (/catalogoasesor)
const path = require('path');
const catalogoPath = path.join(__dirname, '../catalogo-asesor/out');
app.use('/_next', express.static(path.join(catalogoPath, '_next')));
app.use('/catalogoasesor', express.static(catalogoPath));
app.get('/catalogoasesor/*', (req, res) => {
  res.sendFile(path.join(catalogoPath, 'index.html'));
});

// Servir archivos estáticos de React en producción
if (process.env.NODE_ENV === 'production') {
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




