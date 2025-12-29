
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { B2_CONFIG } from '../config/b2.config';
import fetch from 'node-fetch';

const s3Client = new S3Client({
    endpoint: B2_CONFIG.endpoint,
    region: B2_CONFIG.region,
    credentials: {
        accessKeyId: B2_CONFIG.accessKeyId,
        secretAccessKey: B2_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});

async function testUpload() {
    console.log('Testing B2 Upload...');
    console.log('Config:', { ...B2_CONFIG, secretAccessKey: '***' });

    const imageUrl = 'https://cdn.shopify.com/s/files/1/0861/4874/3448/files/1_946f3a5b-d123-4f1e-a35a-b18808f47e23.png?v=1746564412';

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const buffer = await response.buffer();
        console.log(`Downloaded image of size: ${buffer.length} bytes`);

        const key = `test/test-upload-${Date.now()}.png`;

        const command = new PutObjectCommand({
            Bucket: B2_CONFIG.bucketName,
            Key: key,
            Body: buffer,
            ContentType: 'image/png',
        });

        console.log('Sending upload command to B2...');
        await s3Client.send(command);
        console.log(`✅ Upload successful to ${key}`);

    } catch (error) {
        console.error('❌ Upload failed:', error);
    }
}

testUpload();
