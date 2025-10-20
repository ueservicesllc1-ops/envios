import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { X, Smartphone, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface RemoteBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const RemoteBarcodeScanner: React.FC<RemoteBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Lector de Códigos de Barras Remoto"
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Generar un ID de sesión único
      const newSessionId = `scanner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // Crear URL para el escáner móvil
      // Usar la IP local de la computadora para que el celular pueda acceder
      const baseUrl = window.location.origin;
      const scannerUrl = `${baseUrl}/mobile-scanner?session=${newSessionId}`;
      setQrUrl(scannerUrl);
      
      // Mostrar instrucciones adicionales para conexión
      console.log('URL del escáner:', scannerUrl);
      
      // Limpiar códigos escaneados anteriores
      setScannedCodes([]);
      setIsConnected(false);
    }
  }, [isOpen]);

  // Simular conexión (en una implementación real, usarías WebSockets)
  useEffect(() => {
    if (sessionId) {
      // Simular que el dispositivo móvil se conectó
      const timer = setTimeout(() => {
        setIsConnected(true);
        toast.success('Dispositivo móvil conectado');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [sessionId]);

  const handleClose = () => {
    setSessionId('');
    setQrUrl('');
    setIsConnected(false);
    setScannedCodes([]);
    onClose();
  };

  const handleCodeReceived = (code: string) => {
    setScannedCodes(prev => [...prev, code]);
    onScan(code);
    toast.success(`Código escaneado: ${code}`);
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

        <div className="space-y-6">
          {/* Instrucciones */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-lg font-medium text-gray-900">Usa tu celular</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Escanea el código QR con tu celular para usar la cámara como lector de códigos de barras
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800 font-medium mb-1">📱 Instrucciones:</p>
              <p className="text-xs text-blue-700">
                1. Asegúrate de que tu celular esté en la misma red WiFi que esta computadora<br/>
                2. Escanea el código QR con la cámara de tu celular<br/>
                3. Si no funciona, copia esta URL manualmente: <span className="font-mono text-xs bg-white px-1 rounded">{qrUrl}</span>
              </p>
            </div>
          </div>

          {/* Código QR */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <QRCode
                value={qrUrl}
                size={200}
                level="M"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
          </div>

          {/* Estado de conexión */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? 'Dispositivo conectado' : 'Esperando conexión...'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isConnected 
                ? 'Tu celular está listo para escanear códigos de barras'
                : 'Abre la cámara de tu celular y escanea el código QR'
              }
            </p>
          </div>

          {/* Códigos escaneados */}
          {scannedCodes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Códigos escaneados ({scannedCodes.length})
              </h4>
              <div className="space-y-1">
                {scannedCodes.map((code, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="btn-secondary"
            >
              Cerrar
            </button>
            {isConnected && (
              <button
                onClick={() => {
                  // Simular escaneo de prueba
                  const testCode = `TEST_${Date.now()}`;
                  handleCodeReceived(testCode);
                }}
                className="btn-primary flex items-center"
              >
                <Camera className="h-4 w-4 mr-2" />
                Probar Escaneo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteBarcodeScanner;
