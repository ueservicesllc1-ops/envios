import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { X, Smartphone, Camera, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface SimpleBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const SimpleBarcodeScanner: React.FC<SimpleBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Lector de Códigos de Barras"
}) => {
  const [, setSessionId] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Generar un ID de sesión único
      const newSessionId = `scanner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // Crear URL para el escáner móvil
      const baseUrl = window.location.origin;
      const scannerUrl = `${baseUrl}/mobile-scanner?session=${newSessionId}`;
      setQrUrl(scannerUrl);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSessionId('');
    setQrUrl('');
    setCopied(false);
    onClose();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      toast.success('URL copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('No se pudo copiar la URL');
    }
  };

  const handleCodeReceived = (code: string) => {
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

          {/* URL alternativa */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Si el código QR no funciona:
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={qrUrl}
                readOnly
                className="flex-1 text-xs font-mono bg-white border border-gray-300 rounded px-2 py-1"
              />
              <button
                onClick={copyToClipboard}
                className="p-2 text-gray-600 hover:text-blue-600"
                title="Copiar URL"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Copia esta URL y ábrela en tu celular
            </p>
          </div>

          {/* Instrucciones de conexión */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">📱 Instrucciones:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>1. Asegúrate de que tu celular esté en la misma red WiFi</li>
              <li>2. Escanea el código QR o copia la URL</li>
              <li>3. Usa la cámara de tu celular para escanear códigos de barras</li>
            </ul>
          </div>

          {/* Botón de prueba */}
          <div className="text-center">
            <button
              onClick={() => {
                const testCode = `TEST_${Date.now()}`;
                handleCodeReceived(testCode);
              }}
              className="btn-primary flex items-center mx-auto"
            >
              <Camera className="h-4 w-4 mr-2" />
              Probar Escaneo
            </button>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="btn-secondary"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleBarcodeScanner;
