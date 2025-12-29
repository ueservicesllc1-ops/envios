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

    // Retornar URL pública directa de B2 (evita problemas de CORS y proxy)
    // Format: https://f005.backblazeb2.com/file/<bucketName>/<key>
    // B2_CONFIG.publicUrl ya incluye .../file/<bucketName>
    const fullUrl = `${B2_CONFIG.publicUrl}/${key}`; // key comienza con perfumes/
    // Nota: El key ya incluye 'perfumes/', y el publicUrl '.../perfumes'. 
    // Si el key es 'perfumes/brand/file', y publicUrl es '.../file/perfumes',
    // La URL final será '.../file/perfumes/perfumes/brand/file'.
    // Esto es correcto si la estructura de carpetas dentro del bucket es así.

    // Sin embargo, para evitar duplicidad si el bucket se llama perfumes y la carpeta raiz tambien:
    // Voy a cambiar el key para no incluir 'perfumes/' extra si ya está en el bucket, 
    // pero el key es lo que se usa para guardar. 
    // Mejor confío en que publicUrl está bien configurada.

    // Si usamos el proxy era por algo, pero absolute URL es mejor.

    return {
      url: fullUrl,
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

