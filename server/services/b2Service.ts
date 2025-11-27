import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { B2_CONFIG } from '../config/b2.config';
import fetch from 'node-fetch';

// Inicializar cliente S3 para Backblaze B2
const s3Client = new S3Client({
  endpoint: B2_CONFIG.endpoint,
  region: B2_CONFIG.region,
  credentials: {
    accessKeyId: B2_CONFIG.accessKeyId,
    secretAccessKey: B2_CONFIG.secretAccessKey,
  },
  forcePathStyle: true,
});

export interface ImageUploadResult {
  url: string;
  path: string;
  size: number;
}

/**
 * Descarga una imagen desde una URL y la sube a Backblaze B2
 */
export async function uploadImageToB2(
  imageUrl: string,
  brand: string,
  productName: string
): Promise<ImageUploadResult> {
  try {
    // Limpiar URL de Shopify (remover parámetros de tamaño)
    const cleanUrl = imageUrl.split('?')[0];
    
    // Descargar imagen
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://fragrancewholesalerusa.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al descargar imagen: ${response.statusText}`);
    }

    const imageBuffer = await response.buffer();
    
    // Validar que sea una imagen válida (mínimo 100 bytes)
    if (imageBuffer.length < 100) {
      throw new Error('Imagen demasiado pequeña o inválida');
    }

    // Determinar extensión del archivo
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('webp') ? 'webp' :
                     contentType.includes('png') ? 'png' :
                     contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'jpg';

    // Normalizar nombres para el path
    const normalizedBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const normalizedProduct = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    // Crear path único
    const fileName = `${normalizedBrand}-${normalizedProduct}-${timestamp}-${randomId}.${extension}`;
    const key = `perfumes/${normalizedBrand}/${fileName}`;

    // Subir a B2
    const command = new PutObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      CacheControl: 'max-age=31536000', // Cache por 1 año
    });

    await s3Client.send(command);

    // Retornar URL del proxy (el frontend debe usar la URL completa del backend)
    // El frontend debe construir la URL completa usando API_CONFIG.baseUrl
    const proxyPath = `/api/b2/image?path=${encodeURIComponent(key)}`;

    return {
      url: proxyPath, // Path relativo, el frontend construye la URL completa
      path: key,
      size: imageBuffer.length,
    };
  } catch (error) {
    console.error('Error al subir imagen a B2:', error);
    throw error;
  }
}

/**
 * Obtiene una imagen desde B2
 */
export async function getImageFromB2(path: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: path,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('Imagen no encontrada en B2');
    }

    // Convertir stream a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error al obtener imagen de B2:', error);
    throw error;
  }
}

