import express from 'express';
import cors from 'cors';
import { getProductsFromCollection, getProductStats } from './services/shopifyScraper';
import { getImageFromB2 } from './services/b2Service';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📸 Proxy de imágenes: http://localhost:${PORT}/api/b2/image`);
  console.log(`🛍️  Importación: http://localhost:${PORT}/api/shopify/import`);
});




