# Despliegue en Railway

## Variables de Entorno Requeridas

Configura estas variables en Railway Dashboard:

### 1. Firebase (Obligatorias)
```
REACT_APP_FIREBASE_API_KEY=tu-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu-proyecto-id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2. Dominios (Obligatorias)
```
ALLOWED_DOMAINS=comprasexpress.us,ueservicesllc.com
PRIMARY_DOMAIN=comprasexpress.us
```

### 3. Backend API
```
REACT_APP_API_URL=https://api-comprasexpress.up.railway.app
```

### 4. Backblaze B2 (Opcional - si usas almacenamiento de imágenes)
```
B2_KEY_ID=tu-b2-key-id
B2_APPLICATION_KEY=tu-b2-application-key
B2_BUCKET_NAME=tu-bucket-name
B2_BUCKET_ID=tu-bucket-id
```

### 5. Configuración de Entorno
```
NODE_ENV=production
PORT=3001
```

## Configuración de Dominios Personalizados en Railway

1. Ve a tu proyecto en Railway
2. Click en "Settings" → "Domains"
3. Agregar dominios:
   - `comprasexpress.us`
   - `ueservicesllc.com`
4. Configurar DNS en tu proveedor:
   - CNAME: apunta a la URL de Railway
   - O A record: usa la IP que te da Railway

## Comandos

- **Build**: Railway lo detecta automáticamente
- **Start**: `npm run server:dev` (configurado en railway.json)

## Notas

- Los dominios se configuran mediante la variable `ALLOWED_DOMAINS`
- El dominio principal se usa para redirects y configuración general
- CORS está configurado para aceptar ambos dominios
