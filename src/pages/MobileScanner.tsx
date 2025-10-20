import React, { useEffect, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CameraOff, CheckCircle, X } from 'lucide-react';

const MobileScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const readerRef = React.useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    // Obtener session ID de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');
    if (session) {
      setSessionId(session);
    }
  }, []);

  const startScanning = async () => {
    try {
      if (!videoRef.current) return;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Configurar el lector
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        setHasPermission(false);
        return;
      }

      // Usar la cámara trasera si está disponible
      const backCamera = videoInputDevices.find((device: any) => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      const selectedDevice = backCamera || videoInputDevices[0];

      await reader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current,
        (result: any, error?: Error) => {
          if (result) {
            const barcode = result.getText();
            setScannedCode(barcode);
            setIsScanning(false);
            
            // Enviar código al servidor (simulado)
            sendCodeToServer(barcode);
          }
          if (error && !(error instanceof Error && error.name === 'NotFoundException')) {
            console.error('Error scanning:', error);
          }
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      setHasPermission(false);
    }
  };

  const sendCodeToServer = (code: string) => {
    // En una implementación real, enviarías el código al servidor
    // Por ahora, lo mostramos en pantalla
    console.log('Código escaneado:', code);
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current = null;
    }
    setIsScanning(false);
  };

  const resetScanner = () => {
    setScannedCode('');
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            Lector de Códigos de Barras
          </h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isScanning ? 'Escaneando...' : 'Detenido'}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-4">
        {hasPermission === false ? (
          <div className="text-center py-12">
            <CameraOff className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se puede acceder a la cámara
            </h3>
            <p className="text-gray-600 mb-6">
              Verifica que la aplicación tenga permisos de cámara
            </p>
            <button
              onClick={startScanning}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : scannedCode ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¡Código escaneado!
            </h3>
            <div className="bg-white p-4 rounded-lg border-2 border-green-200 mb-6">
              <p className="text-sm text-gray-600 mb-1">Código:</p>
              <p className="text-lg font-mono font-bold text-gray-900 break-all">
                {scannedCode}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={resetScanner}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                Escanear otro código
              </button>
              <button
                onClick={() => window.close()}
                className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Video del escáner */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Overlay con guías */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-32 border-2 border-white rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg"></div>
                </div>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Apunta la cámara al código de barras
              </h3>
              <p className="text-gray-600 text-sm">
                El código se detectará automáticamente
              </p>
            </div>

            {/* Botones de control */}
            <div className="space-y-3">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Iniciar Escaneo
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 flex items-center justify-center"
                >
                  <X className="h-5 w-5 mr-2" />
                  Detener Escaneo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileScanner;
