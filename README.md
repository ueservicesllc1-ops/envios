# Sistema de Gestión de Envíos a Ecuador

Sistema completo de gestión para empresa de envíos a Ecuador con funcionalidades de inventario, contabilidad, vendedores y lector de códigos de barras.

## 🚀 Despliegue en Railway

### Pasos para desplegar:

1. **Crear cuenta en Railway**
   - Ve a [railway.app](https://railway.app)
   - Regístrate con GitHub

2. **Conectar repositorio**
   - Conecta tu repositorio de GitHub
   - Railway detectará automáticamente que es una app React

3. **Variables de entorno**
   - Agrega las variables de Firebase en Railway
   - Las mismas que tienes en tu archivo `src/firebase/config.ts`

4. **Despliegue automático**
   - Railway construirá y desplegará automáticamente
   - Obtendrás una URL pública (ej: `https://tu-app.railway.app`)

### 🔧 Configuración para Railway

El proyecto ya está configurado con:
- `railway.json` - Configuración de Railway
- `Procfile` - Comando de inicio
- Scripts de producción en `package.json`

### 📱 Lector de Códigos de Barras

Una vez desplegado en Railway:
- El código QR funcionará perfectamente
- Tu celular podrá acceder a la URL pública
- La cámara del celular funcionará como lector
- Sin problemas de localhost

### 🎯 Funcionalidades

- ✅ **Gestión de Productos** con lector de códigos de barras
- ✅ **Notas de Entrada** con escaneo automático
- ✅ **Notas de Salida** con precios automáticos
- ✅ **Contabilidad** automática
- ✅ **Gestión de Vendedores** con paneles
- ✅ **Sistema de Envíos** con tracking
- ✅ **Dashboard** con estadísticas en tiempo real

### 🔥 Tecnologías

- **React 18** con TypeScript
- **Firebase** (Firestore, Storage, Auth)
- **Tailwind CSS** para diseño
- **ZXing** para códigos de barras
- **React Router** para navegación

### 📱 Uso del Lector de Códigos

1. **En PC**: Hacer clic en "Escanear" en cualquier formulario
2. **Código QR**: Se genera automáticamente
3. **En Celular**: Escanear el código QR con la cámara
4. **Escáner**: Usar la cámara del celular para escanear códigos de barras
5. **Resultado**: El código se auto-rellena en el formulario

¡Listo para usar en producción! 🚀