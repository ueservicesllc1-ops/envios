import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, Camera, CameraOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código de Barras"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const startScanning = useCallback(async () => {
    try {
      if (!videoRef.current) return;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Configurar el lector
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        toast.error('No se encontró cámara en el dispositivo');
        setHasPermission(false);
        return;
      }

      // Usar la cámara trasera si está disponible, sino la primera disponible
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
            toast.success(`Código escaneado: ${barcode}`);
            onScan(barcode);
            stopScanning();
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
      toast.error('Error al acceder a la cámara. Verifica los permisos.');
      setHasPermission(false);
    }
  }, [onScan]);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, startScanning]);

  const stopScanning = () => {
    if (readerRef.current) {
      // El método reset no existe, simplemente limpiamos la referencia
      readerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          {hasPermission === false ? (
            <div className="text-center py-8">
              <CameraOff className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No se puede acceder a la cámara
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Verifica que la aplicación tenga permisos de cámara
              </p>
              <button
                onClick={startScanning}
                className="mt-4 btn-primary"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-100 rounded-lg object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Overlay con guías de escaneo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-32 border-2 border-white rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg"></div>
                </div>
              </div>

              {/* Indicador de estado */}
              <div className="absolute top-4 left-4">
                <div className="flex items-center space-x-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="text-xs">
                    {isScanning ? 'Escaneando...' : 'Detenido'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Apunta la cámara al código de barras del producto
          </p>
          <p className="text-xs text-gray-500 mt-1">
            El código se detectará automáticamente
          </p>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            Cancelar
          </button>
          {!isScanning && hasPermission && (
            <button
              onClick={startScanning}
              className="btn-primary flex items-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              Iniciar Escaneo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
